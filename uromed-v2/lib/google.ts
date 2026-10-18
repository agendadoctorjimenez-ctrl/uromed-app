import "server-only";
import { service } from "./supabase";
import { decrypt, encrypt } from "./crypto";
import { randomUUID, randomBytes } from "node:crypto";
import {
  toGoogle,
  eventId,
  branchFromEvent,
  changedExternally,
  type GoogleEvent,
  type Appointment,
} from "./calendar-model";
export class GoogleError extends Error {
  constructor(public status: number) {
    super(`Google Calendar HTTP ${status}`);
  }
}
export function appUrl() {
  const u = new URL(process.env.APP_URL ?? "");
  if (process.env.NODE_ENV === "production" && u.protocol !== "https:")
    throw new Error("APP_URL requiere HTTPS");
  return u.origin;
}
export function calendarPath() {
  if (!process.env.GOOGLE_CALENDAR_ID)
    throw new Error("Falta GOOGLE_CALENDAR_ID");
  return `/calendars/${encodeURIComponent(process.env.GOOGLE_CALENDAR_ID)}`;
}
export async function tokenRequest(params: Record<string, string>) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      ...params,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    cache: "no-store",
  });
  if (!r.ok) throw new GoogleError(r.status);
  return (await r.json()) as { access_token: string; refresh_token?: string };
}
async function api<T = unknown>(
  access: string,
  path: string,
  method = "GET",
  body?: unknown,
  etag?: string,
): Promise<T> {
  const r = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${access}`,
      "Content-Type": "application/json",
      ...(etag ? { "If-Match": etag } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new GoogleError(r.status);
  if (r.status === 204) return undefined as T;
  return (await r.json()) as T;
}
async function conflict(
  appointment: Appointment | null,
  event: GoogleEvent,
  reason: string,
) {
  const client = service();
  // Snapshot mínimo; no description ni attendees importados.
  const snapshot = {
    id: event.id,
    etag: event.etag,
    status: event.status,
    summary: event.summary,
    start: event.start,
    end: event.end,
    extendedProperties: event.extendedProperties,
  };
  const { data: open } = await client
    .from("calendar_conflicts")
    .select("id")
    .eq("google_snapshot->>id", event.id)
    .is("resolved_at", null)
    .limit(1);
  if (!open?.length) {
    const { error } = await client
      .from("calendar_conflicts")
      .insert({
        appointment_id: appointment?.id ?? null,
        google_snapshot: snapshot,
        reason,
      });
    if (error) throw error;
  }
  if (appointment) {
    const { error } = await client
      .from("appointments")
      .update({ sync_status: "conflicto" })
      .eq("id", appointment.id);
    if (error) throw error;
  }
}
async function pull(access: string, connection: { sync_token: string | null }) {
  const client = service();
  let pageToken: string | undefined;
  let nextSync: string | undefined;
  do {
    const params = new URLSearchParams({
      maxResults: "250",
      showDeleted: "true",
      singleEvents: "false",
    });
    if (connection.sync_token) params.set("syncToken", connection.sync_token);
    if (pageToken) params.set("pageToken", pageToken);
    let result: {
      items?: GoogleEvent[];
      nextPageToken?: string;
      nextSyncToken?: string;
    };
    try {
      result = await api(access, `${calendarPath()}/events?${params}`);
    } catch (e) {
      if (
        e instanceof GoogleError &&
        e.status === 410 &&
        connection.sync_token
      ) {
        await client
          .from("calendar_connection")
          .update({ sync_token: null })
          .eq("id", 1);
        return await pull(access, { sync_token: null });
      }
      throw e;
    }
    for (const event of result.items ?? []) {
      let { data: found, error: findError } = await client
        .from("appointments")
        .select("*")
        .eq("google_event_id", event.id)
        .maybeSingle();
      if (findError) throw findError;
      if (!found && event.extendedProperties?.private?.uromed_id) {
        const id = event.extendedProperties.private.uromed_id;
        if (/^[0-9a-f-]{36}$/.test(id)) {
          const { data: existing } = await client
            .from("appointments")
            .select("*")
            .eq("id", id)
            .eq("source", "uromed")
            .maybeSingle();
          if (
            existing &&
            event.id === eventId(id, existing.calendar_revision ?? 0)
          )
            found = existing;
        }
      }
      const local = found as Appointment | null;
      if (local?.google_etag === event.etag) continue;
      if (local?.sync_status === "conflicto") continue;
      if (
        local &&
        local.sync_status === "pendiente" &&
        (!local.google_etag || changedExternally(local, event))
      ) {
        await conflict(local, event, "Cambios simultáneos en Google y UROMED");
        continue;
      }
      if (event.status === "cancelled") {
        if (local) {
          const { error } = await client
            .from("appointments")
            .update({
              status: "cancelada",
              google_etag: event.etag,
              sync_status: "sincronizada",
            })
            .eq("id", local.id)
            .eq("updated_at", local.updated_at);
          if (error) throw error;
        }
        continue;
      }
      if (
        event.recurrence ||
        event.recurringEventId ||
        !event.start?.dateTime ||
        !event.end?.dateTime
      ) {
        await conflict(
          local,
          event,
          "Evento de día completo o recurrente: convertirlo a una cita individual con horario",
        );
        continue;
      }
      const patch = {
        branch_id: branchFromEvent(event),
        starts_at: event.start.dateTime,
        ends_at: event.end.dateTime,
        status:
          local?.status === "cancelada"
            ? "agendada"
            : (local?.status ?? "agendada"),
        google_event_id: event.id,
        google_etag: event.etag,
        sync_status: "sincronizada",
        pending_link: !local?.patient_id || !branchFromEvent(event),
      };
      // No vincular por coincidencias de nombre ni por IDs no verificados del evento.
      const mutation = local
        ? client
            .from("appointments")
            .update(patch)
            .eq("id", local.id)
            .eq("updated_at", local.updated_at)
        : client
            .from("appointments")
            .insert({
              ...patch,
              title: (event.summary ?? "Evento externo").slice(0, 200),
              source: "google",
            });
      const { data: mutated, error } = await mutation.select("id");
      if (!error && mutated?.length)
        await client
          .from("calendar_conflicts")
          .update({
            resolved_at: new Date().toISOString(),
            resolution: "Evento corregido e importado",
          })
          .eq("google_snapshot->>id", event.id)
          .is("appointment_id", null)
          .is("resolved_at", null);
      if (!error && local && !mutated?.length) {
        await conflict(local, event, "UROMED cambió durante la importación");
      }
      if (error) {
        await conflict(
          local,
          event,
          error.code === "23P01"
            ? "Solapamiento de horarios: resolver antes de importar"
            : "Evento externo no importable",
        );
      }
    }
    pageToken = result.nextPageToken;
    nextSync = result.nextSyncToken;
  } while (pageToken);
  if (nextSync) {
    const { error } = await client
      .from("calendar_connection")
      .update({ sync_token: nextSync, needs_pull: false })
      .eq("id", 1);
    if (error) throw error;
  }
}
async function push(access: string) {
  const client = service();
  const { data: jobs, error } = await client
    .from("calendar_outbox")
    .select("*")
    .lte("next_attempt", new Date().toISOString())
    .order("next_attempt")
    .limit(50);
  if (error) throw error;
  for (const job of jobs ?? []) {
    const { data: row } = await client
      .from("appointments")
      .select("*")
      .eq("id", job.appointment_id)
      .single();
    if (!row) continue;
    const a = row as Appointment;
    if (a.sync_status === "conflicto") continue;
    try {
      const id = a.google_event_id ?? eventId(a.id, a.calendar_revision ?? 0);
      let etag: string | undefined;
      if (a.status === "cancelada") {
        try {
          await api(
            access,
            `${calendarPath()}/events/${id}`,
            "DELETE",
            undefined,
            a.google_etag ?? undefined,
          );
        } catch (e) {
          if (!(e instanceof GoogleError && [404, 410].includes(e.status)))
            throw e;
        }
      } else {
        let event: GoogleEvent;
        if (a.google_event_id)
          event = await api(
            access,
            `${calendarPath()}/events/${id}`,
            "PATCH",
            toGoogle(a),
            a.google_etag ?? undefined,
          );
        else {
          try {
            event = await api(access, `${calendarPath()}/events`, "POST", {
              id,
              ...toGoogle(a),
            });
          } catch (e) {
            if (!(e instanceof GoogleError && e.status === 409)) throw e;
            const existing = await api<GoogleEvent>(
              access,
              `${calendarPath()}/events/${id}`,
            );
            if (existing.extendedProperties?.private?.uromed_id !== a.id)
              throw new Error("Colisión de identificador");
            event = await api(
              access,
              `${calendarPath()}/events/${id}`,
              "PATCH",
              toGoogle(a),
              existing.etag,
            );
          }
        }
        etag = event.etag;
      }
      // No marcar cambios nuevos como sincronizados: comparar versión leída.
      const { data: updated, error: e } = await client
        .from("appointments")
        .update({
          google_event_id: id,
          google_etag: etag ?? a.google_etag,
          sync_status: "sincronizada",
        })
        .eq("id", a.id)
        .eq("updated_at", a.updated_at)
        .select("id");
      if (e) throw e;
      if (updated?.length) {
        const { error: d } = await client
          .from("calendar_outbox")
          .delete()
          .eq("appointment_id", a.id)
          .eq("version", job.version);
        if (d) throw d;
      } else {
        // Guardar el ETag producido sin tocar la versión de contenido. La cola conserva el cambio posterior.
        await client
          .from("appointments")
          .update({ google_event_id: id, google_etag: etag ?? a.google_etag })
          .eq("id", a.id);
      }
    } catch (e) {
      if (e instanceof GoogleError && [412, 404, 410].includes(e.status)) {
        let remote: GoogleEvent = {
          id: a.google_event_id ?? eventId(a.id, a.calendar_revision ?? 0),
          status: "cancelled",
        };
        try {
          remote = await api(access, `${calendarPath()}/events/${remote.id}`);
        } catch {
          /* deletion snapshot */
        }
        await conflict(
          a,
          remote,
          "El evento de Google cambió o fue eliminado. Elige una versión.",
        );
      } else {
        const attempts = job.attempts + 1;
        const delay = Math.min(3600, 30 * 2 ** Math.min(attempts, 7));
        await client
          .from("calendar_outbox")
          .update({
            attempts,
            next_attempt: new Date(Date.now() + delay * 1000).toISOString(),
            last_error:
              e instanceof GoogleError
                ? e.message
                : "Error de comunicación; reintento pendiente",
          })
          .eq("appointment_id", a.id)
          .eq("version", job.version);
      }
    }
  }
}
async function renewWatch(
  access: string,
  connection: {
    channel_expiry: string | null;
    channel_id: string | null;
    resource_id: string | null;
  },
) {
  if (
    connection.channel_expiry &&
    new Date(connection.channel_expiry).getTime() > Date.now() + 24 * 3600000
  )
    return;
  const client = service();
  const id = randomUUID(),
    channelToken = randomBytes(32).toString("hex");
  const watch = await api<{ resourceId: string; expiration: string }>(
    access,
    `${calendarPath()}/events/watch`,
    "POST",
    {
      id,
      type: "web_hook",
      address: `${appUrl()}/api/calendar/webhook`,
      token: channelToken,
      params: { ttl: "604800" },
    },
  );
  const { error } = await client
    .from("calendar_connection")
    .update({
      channel_id: id,
      channel_token: channelToken,
      resource_id: watch.resourceId,
      channel_expiry: new Date(Number(watch.expiration)).toISOString(),
    })
    .eq("id", 1);
  if (error) throw error;
  if (connection.channel_id && connection.resource_id)
    try {
      await api(access, "/channels/stop", "POST", {
        id: connection.channel_id,
        resourceId: connection.resource_id,
      });
    } catch {
      /* old subscription will expire */
    }
}
export async function syncCalendar() {
  const client = service();
  const owner = randomUUID();
  const { data: lease, error: lerr } = await client.rpc(
    "acquire_calendar_lease",
    { owner_id: owner },
  );
  if (lerr) throw lerr;
  if (!lease) return { status: "ocupado_o_sin_conexion" };
  try {
    const { data: c, error } = await client
      .from("calendar_connection")
      .select("*")
      .eq("id", 1)
      .single();
    if (error || !c) throw new Error("Google no conectado");
    const token = await tokenRequest({
      grant_type: "refresh_token",
      refresh_token: decrypt(c.encrypted_refresh_token),
    });
    if (token.refresh_token)
      await client
        .from("calendar_connection")
        .update({ encrypted_refresh_token: encrypt(token.refresh_token) })
        .eq("id", 1);
    // Pull continuo, no depender únicamente de webhooks. Reconciliación incremental en cada ejecución.
    const full =
      !c.last_full_sync ||
      Date.now() - new Date(c.last_full_sync).getTime() > 24 * 3600000;
    await pull(token.access_token, full ? { sync_token: null } : c);
    if (full)
      await client
        .from("calendar_connection")
        .update({ last_full_sync: new Date().toISOString() })
        .eq("id", 1);
    await push(token.access_token);
    await renewWatch(token.access_token, c);
    await client
      .from("calendar_connection")
      .update({ last_sync: new Date().toISOString(), last_error: null })
      .eq("id", 1);
    return { status: "ejecutado" };
  } catch (e) {
    await client
      .from("calendar_connection")
      .update({
        last_error:
          e instanceof GoogleError
            ? e.message
            : "No se completó la sincronización. Revisa configuración y credenciales.",
      })
      .eq("id", 1);
    throw e;
  } finally {
    await client
      .from("calendar_connection")
      .update({ lease_until: null, lease_owner: null })
      .eq("id", 1)
      .eq("lease_owner", owner);
  }
}

export async function freshConflictEvent(id: string) {
  const client = service();
  const { data: c, error } = await client
    .from("calendar_connection")
    .select("encrypted_refresh_token")
    .eq("id", 1)
    .single();
  if (error || !c) throw new Error("Sin conexión");
  const t = await tokenRequest({
    grant_type: "refresh_token",
    refresh_token: decrypt(c.encrypted_refresh_token),
  });
  try {
    return await api<GoogleEvent>(
      t.access_token,
      `${calendarPath()}/events/${encodeURIComponent(id)}`,
    );
  } catch (e) {
    if (e instanceof GoogleError && [404, 410].includes(e.status))
      return { id, status: "cancelled" } as GoogleEvent;
    throw e;
  }
}
