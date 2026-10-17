import { staff } from "@/lib/auth";
import { today, localToISO, prettyDate } from "@/lib/time";
export default async function Dashboard() {
  const { client, profile } = await staff();
  const day = today();
  const start = localToISO(day + "T00:00");
  const end = localToISO(day + "T23:59");
  const [appts, follows, applications, lots, patients] = await Promise.all([
    client
      .from("appointments")
      .select("*,patients(name)")
      .gte("starts_at", start)
      .lte("starts_at", end)
      .order("starts_at"),
    client
      .from("followups")
      .select("*,patients(name)")
      .eq("status", "pendiente")
      .order("due_date")
      .limit(10),
    client
      .from("applications")
      .select("*,patients(name)")
      .gte("next_date", day)
      .order("next_date")
      .limit(10),
    client.from("inventory_lots").select("*"),
    client
      .from("patients")
      .select("id", { count: "exact", head: true })
      .eq("archived", false),
  ]);
  if (
    appts.error ||
    follows.error ||
    applications.error ||
    lots.error ||
    patients.error
  )
    throw new Error("Error consultando panel");
  const upcoming = applications.data ?? [];
  const alerts = (lots.data ?? []).filter(
    (l) => l.quantity <= l.minimum || l.expires_on <= day,
  );
  let psaCount = 0;
  let surgeries: Record<string, unknown>[] = [];
  if (profile.role === "medico") {
    const [{ data: settings }, { data: psa }, { data: s }] = await Promise.all([
      client.from("site_settings").select("psa_threshold").single(),
      client.from("psa").select("total").eq("reviewed", false),
      client
        .from("surgeries")
        .select("*,patients(name)")
        .eq("status", "programada")
        .gte("surgery_date", start)
        .order("surgery_date")
        .limit(10),
    ]);
    psaCount = (psa ?? []).filter(
      (p) => p.total >= (settings?.psa_threshold ?? 4),
    ).length;
    surgeries = s ?? [];
  }
  return (
    <>
      <header>
        <span className="eyebrow">{day} · Ciudad de México</span>
        <h1>El consultorio, al día.</h1>
        <p className="quiet">Citas, aplicaciones y pendientes del equipo.</p>
      </header>
      <div className="grid three">
        {[
          [
            "Citas de hoy",
            appts.data?.filter((a) => a.status !== "cancelada").length ?? 0,
          ],
          [
            "La Piedad",
            appts.data?.filter(
              (a) => a.branch_id === "LP" && a.status !== "cancelada",
            ).length ?? 0,
          ],
          [
            "Zamora",
            appts.data?.filter(
              (a) => a.branch_id === "ZAM" && a.status !== "cancelada",
            ).length ?? 0,
          ],
          ["Pacientes activos", patients.count ?? 0],
          ["Alertas de inventario", alerts.length],
          ...(profile.role === "medico" ? [["PSA por revisar", psaCount]] : []),
        ].map(([label, value]) => (
          <div className="card" key={String(label)}>
            <span className="metric-label">{label}</span>
            <div className="metric">{value}</div>
          </div>
        ))}
      </div>
      <div className="grid two section-gap">
        <section className="card">
          <div className="row between">
            <h2>Citas de hoy</h2>
            <a className="red" href="/sistema/agenda">
              Abrir agenda →
            </a>
          </div>
          {!appts.data?.length ? (
            <p className="quiet">Sin citas hoy.</p>
          ) : (
            appts.data.map((a) => (
              <p key={a.id}>
                <a className="red" href={`/sistema/agenda?edit=${a.id}`}>
                  {prettyDate(a.starts_at)} ·{" "}
                  {a.patients?.name ?? "Vinculación pendiente"}
                </a>
                <br />
                <span className="badge">
                  {a.branch_id ?? "Sucursal pendiente"} · {a.status}
                </span>
              </p>
            ))
          )}
        </section>
        <section className="card">
          <h2>Seguimientos pendientes</h2>
          {!follows.data?.length ? (
            <p className="quiet">Sin pendientes.</p>
          ) : (
            follows.data.map((f) => (
              <p key={f.id}>
                <a className="red" href={`/sistema/seguimientos?edit=${f.id}`}>
                  {f.due_date} · {f.patients?.name}
                </a>
                <br />
                {f.reason} <span className="badge">{f.priority}</span>
              </p>
            ))
          )}
        </section>
        <section className="card">
          <h2>Próximas aplicaciones</h2>
          {!upcoming.length ? (
            <p className="quiet">Sin próximas aplicaciones registradas.</p>
          ) : (
            upcoming.map((a) => (
              <p key={a.id}>
                {a.next_date} · {a.patients?.name}
                <br />
                <span className="badge">
                  {a.kind === "vacuna" ? "Vacuna" : "Zoladex"} · {a.dose}
                </span>
              </p>
            ))
          )}
        </section>
        <section className="card">
          <h2>Inventario por revisar</h2>
          {!alerts.length ? (
            <p className="quiet">Sin alertas.</p>
          ) : (
            alerts.map((a) => (
              <p key={a.id}>
                {a.item} · {a.lot}
                <br />
                <span className="badge">
                  {a.quantity} unidades · caduca {a.expires_on}
                </span>
              </p>
            ))
          )}
        </section>
        {profile.role === "medico" && (
          <section className="card">
            <h2>Cirugías próximas</h2>
            {!surgeries.length ? (
              <p className="quiet">Sin cirugías registradas.</p>
            ) : (
              surgeries.map((s) => (
                <p key={String(s.id)}>
                  {prettyDate(String(s.surgery_date))} · {String(s.procedure)}
                </p>
              ))
            )}
          </section>
        )}
      </div>
    </>
  );
}
