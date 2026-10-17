import { staff } from "@/lib/auth";
import { service } from "@/lib/supabase";
import { SettingsForm } from "@/components/forms";
import { SyncButton, ResolveButtons } from "@/components/calendar-controls";
export default async function Settings() {
  const { client } = await staff(true);
  const [{ data: s }, { data: b }, { data: audit }, { data: conflicts }] =
    await Promise.all([
      client.from("site_settings").select("*").single(),
      client.from("branches").select("*"),
      client
        .from("audit_log")
        .select("*")
        .order("occurred_at", { ascending: false })
        .limit(50),
      client
        .from("calendar_conflicts")
        .select("*")
        .is("resolved_at", null)
        .order("created_at"),
    ]);
  let connection: {
    last_sync: string | null;
    last_error: string | null;
    channel_expiry: string | null;
  } | null = null;
  let pending: number | null = null;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = service();
    const [{ data: c }, { count }] = await Promise.all([
      admin
        .from("calendar_connection")
        .select("last_sync,last_error,channel_expiry")
        .eq("id", 1)
        .maybeSingle(),
      admin
        .from("calendar_outbox")
        .select("appointment_id", { count: "exact", head: true }),
    ]);
    connection = c;
    pending = count;
  }
  return (
    <>
      <header>
        <span className="eyebrow">Médico administrador</span>
        <h1>Configuración</h1>
        <p className="quiet">
          Tarjeta pública, sucursales y conexión con Google.
        </p>
      </header>
      {s && b && <SettingsForm settings={s} branches={b} />}
      <section className="card section-gap">
        <h2>Un calendario para ambas sedes</h2>
        <p className="quiet">
          Los eventos se publican como «Consulta UROMED · Sucursal», con horario
          y estado. Sin información clínica.
        </p>
        {connection ? (
          <>
            <p>
              Conectado · Último proceso: {connection.last_sync ?? "Pendiente"}
              <br />
              Cola de cambios: {pending ?? "—"} · Webhook hasta:{" "}
              {connection.channel_expiry ?? "Pendiente"}
            </p>
            {connection.last_error && (
              <p className="error">{connection.last_error}</p>
            )}
            <SyncButton />
          </>
        ) : (
          <a className="btn" href="/api/calendar/connect">
            Autorizar Google Calendar
          </a>
        )}
        <p className="small quiet">
          Para citas creadas directamente en Google, usa [LP] o [ZAM] en el
          título. Vincula al paciente desde Agenda. Los eventos de día completo
          o recurrentes requieren conversión manual.
        </p>
      </section>
      <section className="card section-gap">
        <h2>Conflictos de sincronización</h2>
        {!conflicts?.length && (
          <p className="quiet">Sin conflictos abiertos.</p>
        )}
        {conflicts?.map((c) => (
          <article className="record-details" key={c.id}>
            <h3>{c.reason}</h3>
            <p>
              {c.google_snapshot.summary ?? c.google_snapshot.id}
              <br />
              Google: {c.google_snapshot.start?.dateTime ??
                "Sin horario"} → {c.google_snapshot.end?.dateTime ?? "—"}
            </p>
            {c.appointment_id ? (
              <>
                <a
                  className="red"
                  href={`/sistema/agenda?edit=${c.appointment_id}`}
                >
                  Ver versión UROMED →
                </a>
                <ResolveButtons id={c.id} />
              </>
            ) : (
              <p className="quiet">
                Corrige el evento en Google y sincroniza de nuevo.
              </p>
            )}
          </article>
        ))}
      </section>
      <section className="card section-gap">
        <h2>Auditoría · últimas 50 operaciones</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tabla</th>
                <th>Registro</th>
                <th>Acción</th>
                <th>Actor</th>
                <th>Campos</th>
              </tr>
            </thead>
            <tbody>
              {audit?.map((a) => (
                <tr key={a.id}>
                  <td>{a.occurred_at}</td>
                  <td>{a.table_name}</td>
                  <td>{a.record_id}</td>
                  <td>{a.action}</td>
                  <td>{a.actor_id ?? "Integración servidor"}</td>
                  <td>{a.changed_fields.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
