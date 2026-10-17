import { staff } from "@/lib/auth";
import { service } from "@/lib/supabase";
import { freshConflictEvent } from "@/lib/google";
import { z } from "zod";
export async function POST(request: Request) {
  await staff(true);
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return new Response(null, { status: 403 });
  const parsed = z
    .object({ id: z.string().uuid(), choice: z.enum(["google", "uromed"]) })
    .safeParse(await request.json());
  if (!parsed.success)
    return new Response("Solicitud inválida", { status: 400 });
  const client = service(),
    owner = crypto.randomUUID();
  const { data: lease } = await client.rpc("acquire_calendar_lease", {
    owner_id: owner,
  });
  if (!lease)
    return new Response(
      "Espera a que termine la sincronización y vuelve a intentar.",
      { status: 409 },
    );
  try {
    const { data: c } = await client
      .from("calendar_conflicts")
      .select("*")
      .eq("id", parsed.data.id)
      .is("resolved_at", null)
      .single();
    if (!c?.appointment_id)
      return new Response(
        "Corrige el evento en Google y sincroniza nuevamente.",
        { status: 422 },
      );
    const latest = await freshConflictEvent(c.google_snapshot.id);
    if (
      latest.etag !== c.google_snapshot.etag ||
      latest.status !== c.google_snapshot.status
    ) {
      const snapshot = {
        id: latest.id,
        etag: latest.etag,
        status: latest.status,
        summary: latest.summary,
        start: latest.start,
        end: latest.end,
        extendedProperties: latest.extendedProperties,
      };
      await client
        .from("calendar_conflicts")
        .update({ google_snapshot: snapshot })
        .eq("id", c.id);
      return new Response(
        "Google volvió a cambiar. Actualiza esta página y revisa la nueva versión.",
        { status: 409 },
      );
    }
    const { error } = await client.rpc("resolve_calendar_conflict", {
      p_id: c.id,
      p_choice: parsed.data.choice,
    });
    if (error)
      return Response.json(
        { error: "No se aplicó. Revisa cambios o solapamientos de citas." },
        { status: 409 },
      );
    return Response.json({ ok: true });
  } catch {
    return new Response("No se pudo comprobar Google. Vuelve a intentar.", {
      status: 503,
    });
  } finally {
    await client
      .from("calendar_connection")
      .update({ lease_until: null, lease_owner: null })
      .eq("id", 1)
      .eq("lease_owner", owner);
  }
}
