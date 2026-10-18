import { notFound } from "next/navigation";
import { staff } from "@/lib/auth";
import { modules, labels } from "@/lib/modules";
import { RecordForm, StockForm, type Row } from "@/components/forms";
import { Calendar, calendarRange } from "@/components/calendar";
import { today, prettyDate } from "@/lib/time";
import { closeNote } from "@/app/actions";
import { z } from "zod";
export default async function ModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ module: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { module } = await params;
  const config = modules[module];
  if (!config) notFound();
  const { client, profile } = await staff(config.doctor);
  const sp = await searchParams;
  const { data: patients, error: pe } = await client
    .from("patients")
    .select("id,name,phone,folio")
    .order("name");
  if (pe) throw pe;
  const { data: lots } = await client
    .from("inventory_lots")
    .select("id,item,lot,quantity,kind,presentation");
  let query = client.from(config.table).select("*");
  if (module === "vacunas") query = query.eq("kind", "vacuna");
  if (module === "zoladex") query = query.eq("kind", "zoladex");
  const view = ["dia", "semana", "mes"].includes(sp.view ?? "")
    ? sp.view!
    : "semana";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.date ?? "") ? sp.date! : today();
  if (module === "agenda") {
    const range = calendarRange(view, date);
    query = query.gte("starts_at", range.start).lt("starts_at", range.end);
  }
  if (
    sp.patient &&
    z.string().uuid().safeParse(sp.patient).success &&
    module !== "pacientes" &&
    module !== "inventario"
  )
    query = query.eq("patient_id", sp.patient);
  if (
    sp.branch &&
    ["LP", "ZAM"].includes(sp.branch) &&
    ["pacientes", "agenda", "inventario", "cirugias"].includes(module)
  )
    query = query.eq("branch_id", sp.branch);
  const q = (sp.q ?? "").trim().toLocaleLowerCase("es-MX");
  if (q && module !== "pacientes" && module !== "inventario") {
    const ids = (patients ?? [])
      .filter((p) =>
        `${p.name} ${p.phone} ${p.folio}`
          .toLocaleLowerCase("es-MX")
          .includes(q),
      )
      .map((p) => p.id);
    query = query.in(
      "patient_id",
      ids.length ? ids : ["00000000-0000-0000-0000-000000000000"],
    );
  }
  if (q && module === "pacientes") {
    const ids = (patients ?? [])
      .filter((p) =>
        `${p.name} ${p.phone} ${p.folio}`
          .toLocaleLowerCase("es-MX")
          .includes(q),
      )
      .map((p) => p.id);
    query = query.in(
      "id",
      ids.length ? ids : ["00000000-0000-0000-0000-000000000000"],
    );
  }
  const page = Math.max(1, Number(sp.page) || 1),
    size = 50;
  const { data, error } = await query
    .order(module === "agenda" ? "starts_at" : "created_at", {
      ascending: module === "agenda",
    })
    .range(
      module === "agenda" ? 0 : (page - 1) * size,
      module === "agenda" ? 1999 : page * size - 1,
    );
  if (error) throw error;
  const rows = (data ?? []) as Row[];
  let edit: Row | undefined;
  if (sp.edit && z.string().uuid().safeParse(sp.edit).success) {
    const { data: e } = await client
      .from(config.table)
      .select("*")
      .eq("id", sp.edit)
      .single();
    edit = e ?? undefined;
  }
  const canWrite = module !== "inventario" || profile.role === "medico";
  const immutable =
    ["vacunas", "zoladex"].includes(module) || Boolean(edit?.closed_at);
  const opts = (patients ?? []).map((p) => ({
    id: p.id,
    name: `${p.name} · ${p.folio}`,
  }));
  const lotOpts = (lots ?? [])
    .filter((l) =>
      module === "vacunas"
        ? l.kind === "vacuna" && l.item.toLowerCase().includes("gardasil")
        : module === "zoladex"
          ? l.kind === "zoladex"
          : true,
    )
    .map((l) => ({
      id: l.id,
      name: `${l.item} ${l.presentation} · ${l.lot} (${l.quantity})`,
    }));
  const value = (row: Row, key: string) => {
    const v = row[key];
    if (key === "patient_id")
      return patients?.find((p) => p.id === v)?.name ?? "Por vincular";
    if (key === "lot_id") {
      const l = lots?.find((l) => l.id === v);
      return l ? `${l.item} · ${l.lot}` : String(v);
    }
    if (key === "branch_id")
      return v === "LP" ? "La Piedad" : v === "ZAM" ? "Zamora" : "Pendiente";
    if (typeof v === "boolean") return v ? "Sí" : "No";
    if (
      v &&
      [
        "starts_at",
        "created_at",
        "surgery_date",
        "applied_at",
        "closed_at",
      ].includes(key)
    )
      return prettyDate(String(v));
    return String(v ?? "—");
  };
  const paramsNext = new URLSearchParams(
    Object.entries(sp).filter(
      (x): x is [string, string] => typeof x[1] === "string",
    ),
  );
  paramsNext.set("page", String(page + 1));
  return (
    <>
      <header>
        <span className="eyebrow">UROMED CLÍNICO</span>
        <h1>{config.title}</h1>
        <p className="quiet">{config.description}</p>
      </header>
      <form className="row toolbar">
        <input
          name="q"
          aria-label="Buscar por nombre, teléfono o folio"
          placeholder="Nombre, teléfono o folio"
          defaultValue={sp.q}
          style={{ maxWidth: 300 }}
        />
        {["pacientes", "agenda", "inventario", "cirugias"].includes(module) && (
          <select
            name="branch"
            defaultValue={sp.branch ?? ""}
            aria-label="Sucursal"
            style={{ maxWidth: 180 }}
          >
            <option value="">Ambas sucursales</option>
            <option value="LP">La Piedad</option>
            <option value="ZAM">Zamora</option>
          </select>
        )}
        {module === "agenda" && (
          <>
            <input
              name="date"
              type="date"
              defaultValue={date}
              aria-label="Fecha"
              style={{ maxWidth: 170 }}
            />
            <select
              name="view"
              defaultValue={view}
              aria-label="Vista"
              style={{ maxWidth: 150 }}
            >
              <option value="dia">Día</option>
              <option value="semana">Semana</option>
              <option value="mes">Mes</option>
            </select>
          </>
        )}
        <button>Aplicar</button>
        <a className="quiet" href={`/sistema/${module}`}>
          Limpiar
        </a>
      </form>
      {canWrite && (
        <details
          className="card"
          open={Boolean(
            sp.new || (edit && !immutable && module !== "inventario"),
          )}
        >
          <summary>
            {edit && !immutable && module !== "inventario"
              ? "Editar registro"
              : "Crear nuevo registro"}
          </summary>
          <p className="small quiet">Los campos con * son obligatorios.</p>
          <RecordForm
            key={edit && !immutable ? String(edit.id) : "new"}
            module={module}
            row={immutable || module === "inventario" ? undefined : edit}
            patients={opts}
            lots={lotOpts}
            patientId={sp.patient}
          />
        </details>
      )}
      {edit && (
        <section className="card section-gap">
          <h2>Detalle del registro</h2>
          <p className="small quiet">ID: {String(edit.id)}</p>
          <dl className="record-details">
            {config.fields.map((f) => (
              <div key={f.key}>
                <dt>{f.label}</dt>
                <dd>{value(edit!, f.key)}</dd>
              </div>
            ))}
          </dl>
          {module === "notas" &&
            (!edit.closed_at ? (
              <form action={closeNote.bind(null, String(edit.id))}>
                <button>Cerrar nota de forma definitiva</button>
              </form>
            ) : (
              <p className="badge">
                Cerrada · {prettyDate(String(edit.closed_at))}. Para corregir,
                crea otra nota con el ID de esta en «Nota a enmendar».
              </p>
            ))}
        </section>
      )}
      {module === "agenda" && (
        <section className="card section-gap">
          <Calendar
            rows={rows.map((r) => ({
              ...r,
              patient_name:
                patients?.find((p) => p.id === r.patient_id)?.name ?? r.title,
            }))}
            view={view}
            date={date}
          />
        </section>
      )}
      <section className="card section-gap">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {config.columns.map((c) => (
                  <th key={c}>{labels[c] ?? c}</th>
                ))}
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={String(r.id)}>
                  {config.columns.map((c) => (
                    <td key={c}>{value(r, c)}</td>
                  ))}
                  <td>
                    <a
                      href={`/sistema/${module}?edit=${r.id}${module === "agenda" ? `&date=${date}&view=${view}` : ""}`}
                    >
                      Ver
                      {!["vacunas", "zoladex", "inventario"].includes(module) &&
                      !r.closed_at
                        ? " / editar"
                        : ""}
                    </a>
                    {(r.patient_id || module === "pacientes") && (
                      <>
                        <br />
                        <a
                          href={`/sistema/paciente/${module === "pacientes" ? r.id : r.patient_id}`}
                        >
                          Expediente →
                        </a>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <p className="empty">Sin registros para esta búsqueda.</p>
          )}
        </div>
        {module !== "agenda" && (
          <div className="row section-gap">
            {page > 1 && (
              <a className="btn secondary" href={`?page=${page - 1}`}>
                Anterior
              </a>
            )}
            <span className="quiet small">
              Página {page} · hasta 50 registros
            </span>
            {rows.length === size && (
              <a className="btn secondary" href={`?${paramsNext}`}>
                Siguiente →
              </a>
            )}
          </div>
        )}
      </section>
      {module === "inventario" && profile.role === "medico" && (
        <details className="card section-gap">
          <summary>Registrar entrada / salida</summary>
          <StockForm lots={lotOpts} />
        </details>
      )}
    </>
  );
}
