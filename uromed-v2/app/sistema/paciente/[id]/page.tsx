import { TrendChart } from "@/components/trend-chart";
import { staff } from "@/lib/auth";
import { notFound } from "next/navigation";
import { prettyDate } from "@/lib/time";
import { PsaChart } from "@/components/psa-chart";
import { UploadForm } from "@/components/forms";
import { z } from "zod";
export default async function PatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const { client, profile } = await staff();
  const { data: p, error } = await client
    .from("patients")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !p) notFound();
  const [{ data: appts }, { data: apps }, { data: follows }] =
    await Promise.all([
      client
        .from("appointments")
        .select("*")
        .eq("patient_id", id)
        .order("starts_at", { ascending: false }),
      client
        .from("applications")
        .select("*,inventory_lots(item,lot,presentation,expires_on)")
        .eq("patient_id", id)
        .order("applied_at", { ascending: false }),
      client
        .from("followups")
        .select("*")
        .eq("patient_id", id)
        .order("due_date"),
    ]);
  let clinical: React.ReactNode = null;
  if (profile.role === "medico") {
    const [notes, labs, psa, files, settings, surgeries] = await Promise.all([
      client
        .from("medical_notes")
        .select("*,profiles:author_id(name)")
        .eq("patient_id", id)
        .order("created_at", { ascending: false }),
      client
        .from("laboratories")
        .select("*")
        .eq("patient_id", id)
        .order("study_date", { ascending: false }),
      client.from("psa").select("*").eq("patient_id", id).order("study_date"),
      client
        .from("clinical_files")
        .select("*")
        .eq("patient_id", id)
        .order("created_at", { ascending: false }),
      client.from("site_settings").select("psa_threshold").single(),
      client
        .from("surgeries")
        .select("*")
        .eq("patient_id", id)
        .order("surgery_date", { ascending: false }),
    ]);
    if (
      notes.error ||
      labs.error ||
      psa.error ||
      files.error ||
      surgeries.error
    )
      throw new Error("No se pudo leer el expediente");
    const labGroups = new Map<
      string,
      { units: string; values: { date: string; value: number }[] }
    >();
    for (const l of labs.data ?? []) {
      if (l.numeric_value === null) continue;
      const key = `${l.study} (${l.units})`;
      const group = labGroups.get(key) ?? {
        units: l.units || "unidades no especificadas",
        values: [] as { date: string; value: number }[],
      };
      group.values.push({ date: l.study_date, value: Number(l.numeric_value) });
      labGroups.set(key, group);
    }
    clinical = (
      <>
        <section className="card section-gap">
          <div className="row between">
            <h2>Notas clínicas</h2>
            <a className="red" href={`/sistema/notas?new=1&patient=${id}`}>
              Nueva consulta / evolución →
            </a>
          </div>
          {!notes.data?.length && <p className="quiet">Sin notas.</p>}
          {notes.data?.map((n) => (
            <details key={n.id}>
              <summary>
                {prettyDate(n.created_at)} · {n.reason} ·{" "}
                {n.closed_at ? "Cerrada" : "Borrador"}
              </summary>
              <p className="small quiet">
                Profesional: {n.profiles?.name ?? n.author_id} · ID: {n.id}
                {n.amendment_to ? ` · Enmienda a ${n.amendment_to}` : ""}
              </p>
              <dl className="record-details">
                {Object.entries({
                  family_history: "Antecedentes familiares",
                  medical_history: "Antecedentes médicos",
                  surgical_history: "Antecedentes quirúrgicos",
                  allergies: "Alergias",
                  medicines: "Medicamentos",
                  present_illness: "Padecimiento actual",
                  examination: "Exploración",
                  diagnosis: "Diagnóstico",
                  treatment: "Tratamiento",
                  instructions: "Indicaciones",
                  evolution: "Evolución",
                }).map(([k, l]) => (
                  <div key={k}>
                    <dt>{l}</dt>
                    <dd>{String(n[k] ?? "—")}</dd>
                  </div>
                ))}
              </dl>
              <a className="red" href={`/sistema/notas?edit=${n.id}`}>
                Abrir nota →
              </a>
            </details>
          ))}
        </section>
        <div className="grid two section-gap">
          <section className="card">
            <h2>PSA</h2>
            <PsaChart
              values={psa.data ?? []}
              threshold={settings.data?.psa_threshold ?? 4}
            />
            <a className="red" href={`/sistema/psa?new=1&patient=${id}`}>
              Registrar PSA →
            </a>
            {psa.data?.map((v) => (
              <p key={v.id}>
                {v.study_date} · Total {v.total} · Libre {v.free ?? "—"} ng/mL
                <br />
                <span className="quiet small">
                  {v.laboratory} · {v.observations}
                </span>
              </p>
            ))}
          </section>
          <section className="card">
            <div className="row between">
              <h2>Laboratorios</h2>
              <a
                className="red"
                href={`/sistema/laboratorios?new=1&patient=${id}`}
              >
                Registrar →
              </a>
            </div>
            {labs.data?.map((l) => (
              <p key={l.id}>
                <b>{l.study}</b> · {l.study_date}
                <br />
                {l.numeric_value} {l.units} · {l.descriptive_value}
                <br />
                <span className="quiet small">
                  {l.laboratory} · Referencia: {l.reference_range} ·{" "}
                  {l.observations}
                </span>
              </p>
            ))}
          </section>
        </div>
        <section className="card section-gap">
          <h2>Cirugías</h2>
          {surgeries.data?.map((s) => (
            <p key={s.id}>
              <a className="red" href={`/sistema/cirugias?edit=${s.id}`}>
                {s.procedure} · {prettyDate(s.surgery_date)}
              </a>
              <br />
              {s.status} · {s.hospital}
            </p>
          ))}
        </section>
        {[...labGroups.entries()]
          .filter(([, g]) => g.values.length > 1)
          .map(([name, g]) => (
            <section className="card section-gap" key={name}>
              <h2>{name} · Evolución</h2>
              <TrendChart values={g.values} units={g.units} />
            </section>
          ))}
        <section className="card section-gap">
          <h2>Archivos privados y fotografía</h2>
          {files.data?.map((f) => (
            <p key={f.id}>
              <a
                className="red"
                href={`/api/files/${f.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {f.name} ↗
              </a>{" "}
              <span className="badge">{f.purpose}</span>
            </p>
          ))}
          <details>
            <summary>Adjuntar archivo</summary>
            <UploadForm
              patientId={id}
              laboratories={(labs.data ?? []).map((l) => ({
                id: l.id,
                name: `${l.study} · ${l.study_date}`,
              }))}
            />
          </details>
        </section>
      </>
    );
  }
  return (
    <>
      <header>
        <span className="eyebrow">Expediente · {p.folio}</span>
        <h1>{p.name}</h1>
        <p className="quiet">
          {p.phone} · {p.birth_date ?? "Nacimiento sin registrar"} · {p.sex} ·{" "}
          {p.branch_id === "LP" ? "La Piedad" : "Zamora"}
        </p>
        <p>Contacto: {p.contact || "Sin registrar"}</p>
        <a className="btn secondary" href={`/sistema/pacientes?edit=${id}`}>
          Editar datos generales
        </a>
      </header>
      <div className="grid two">
        <section className="card">
          <h2>Citas</h2>
          <a className="red" href={`/sistema/agenda?new=1&patient=${id}`}>
            Agendar →
          </a>
          {appts?.map((a) => (
            <p key={a.id}>
              {prettyDate(a.starts_at)} · {a.status}
              <br />
              <span className="small quiet">{a.admin_notes}</span>
            </p>
          ))}
        </section>
        <section className="card">
          <h2>Vacunas y Zoladex</h2>
          {apps?.map((a) => (
            <p key={a.id}>
              {prettyDate(a.applied_at)} · {a.inventory_lots?.item}{" "}
              {a.inventory_lots?.presentation}
              <br />
              Dosis: {a.dose} · Lote: {a.inventory_lots?.lot} · Caducidad:{" "}
              {a.inventory_lots?.expires_on}
              <br />
              Responsable: {a.responsible} · Próxima: {a.next_date ?? "—"}
            </p>
          ))}
        </section>
        <section className="card">
          <h2>Seguimientos</h2>
          {follows?.map((f) => (
            <p key={f.id}>
              {f.due_date} · {f.reason} · {f.status}
            </p>
          ))}
        </section>
      </div>
      {clinical}
    </>
  );
}
