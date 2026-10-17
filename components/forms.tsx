"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  save,
  login,
  adjustStock,
  uploadFile,
  saveSettings,
  type Result,
} from "@/app/actions";
import { modules, type Field } from "@/lib/modules";
import { localInput } from "@/lib/time";
export type Row = Record<string, string | number | boolean | null>;
export type Option = { id: string; name: string };
function Feedback({ state }: { state: Result }) {
  return (
    <div aria-live="polite">
      {state.error && <p className="error">{state.error}</p>}
      {state.success && <p className="success">{state.success}</p>}
    </div>
  );
}
function FieldInput({
  field: f,
  value,
  options = [],
}: {
  field: Field;
  value?: unknown;
  options?: Option[];
}) {
  const val =
    f.type === "datetime-local" && value
      ? localInput(String(value))
      : String(value ?? "");
  return (
    <div className="field">
      <label htmlFor={f.key}>
        {f.label}
        {f.required ? " *" : ""}
      </label>
      {f.type === "textarea" ? (
        <textarea
          id={f.key}
          name={f.key}
          defaultValue={val}
          required={f.required}
          maxLength={20000}
        />
      ) : f.type === "select" ? (
        <select
          id={f.key}
          name={f.key}
          defaultValue={val || f.options?.[0] || ""}
          required={f.required}
        >
          {!f.options && <option value="">Selecciona…</option>}
          {f.options
            ? f.options.map((o) => (
                <option key={o} value={o}>
                  {o === "LP" ? "La Piedad" : o === "ZAM" ? "Zamora" : o}
                </option>
              ))
            : options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
        </select>
      ) : f.type === "checkbox" ? (
        <input
          type="checkbox"
          id={f.key}
          name={f.key}
          defaultChecked={Boolean(value)}
        />
      ) : (
        <input
          id={f.key}
          name={f.key}
          type={f.type ?? "text"}
          defaultValue={val}
          required={f.required}
          min={f.min}
          max={f.max}
          step={f.step}
          maxLength={f.type === "text" || !f.type ? 2000 : undefined}
        />
      )}
    </div>
  );
}
export function RecordForm({
  module,
  row,
  patients,
  lots,
  patientId,
}: {
  module: string;
  row?: Row;
  patients: Option[];
  lots: Option[];
  patientId?: string;
}) {
  const [state, action, pending] = useActionState(
    save.bind(null, module, row ? String(row.id) : undefined),
    {},
  );
  const [key, setKey] = useState("");
  const router = useRouter();
  useEffect(() => setKey(crypto.randomUUID()), []);
  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);
  return (
    <form action={action}>
      <input type="hidden" name="idempotency_key" value={key} />
      <fieldset disabled={pending}>
        <div className="grid two">
          {modules[module].fields.map((f) => (
            <FieldInput
              key={f.key}
              field={f}
              value={
                row?.[f.key] ?? (f.key === "patient_id" ? patientId : undefined)
              }
              options={
                f.key === "patient_id"
                  ? patients
                  : f.key === "lot_id"
                    ? lots
                    : []
              }
            />
          ))}
        </div>
        <Feedback state={state} />
        <button
          disabled={
            pending ||
            (["vacunas", "zoladex"].includes(module) &&
              (!key || Boolean(state.success)))
          }
        >
          {pending
            ? "Guardando…"
            : state.success && ["vacunas", "zoladex"].includes(module)
              ? "Aplicación confirmada"
              : "Guardar"}
        </button>
      </fieldset>
    </form>
  );
}
export function LoginForm() {
  const [state, action, pending] = useActionState(login, {});
  return (
    <form action={action}>
      <div className="field">
        <label htmlFor="email">Correo de acceso</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <Feedback state={state} />
      <button disabled={pending}>
        {pending ? "Ingresando…" : "Ingresar al consultorio"}
      </button>
    </form>
  );
}
export function StockForm({ lots }: { lots: Option[] }) {
  const [state, action, pending] = useActionState(adjustStock, {});
  return (
    <form action={action}>
      <FieldInput
        field={{ key: "lot_id", label: "Lote", type: "select", required: true }}
        options={lots}
      />
      <FieldInput
        field={{
          key: "delta",
          label: "Unidades (+ entrada / − salida)",
          type: "number",
          step: "1",
          required: true,
        }}
      />
      <FieldInput field={{ key: "reason", label: "Motivo", required: true }} />
      <Feedback state={state} />
      <button disabled={pending}>Registrar movimiento</button>
    </form>
  );
}
export function UploadForm({
  patientId,
  laboratories,
}: {
  patientId: string;
  laboratories: Option[];
}) {
  const [state, action, pending] = useActionState(uploadFile, {});
  return (
    <form action={action}>
      <input type="hidden" name="patient_id" value={patientId} />
      <FieldInput
        field={{
          key: "purpose",
          label: "Tipo de archivo",
          type: "select",
          options: ["documento", "fotografia", "laboratorio", "preoperatorio"],
        }}
      />
      <FieldInput
        field={{
          key: "laboratory_id",
          label: "Resultado de laboratorio (opcional)",
          type: "select",
        }}
        options={laboratories}
      />
      <label htmlFor="file">PDF, JPEG o PNG · máximo 10 MB</label>
      <input
        id="file"
        type="file"
        name="file"
        accept="application/pdf,image/jpeg,image/png"
        required
      />
      <Feedback state={state} />
      <button disabled={pending} style={{ marginTop: 12 }}>
        Guardar archivo privado
      </button>
    </form>
  );
}
export function SettingsForm({
  settings,
  branches,
}: {
  settings: Row;
  branches: Row[];
}) {
  const [state, action, pending] = useActionState(saveSettings, {});
  return (
    <form action={action}>
      <div className="grid two">
        <div className="card">
          <h2>Tarjeta pública</h2>
          {[
            { key: "biography", label: "Presentación", type: "textarea" },
            {
              key: "services",
              label: "Servicios (separados con punto y coma)",
              type: "textarea",
            },
            { key: "beneficiary", label: "Beneficiario" },
            { key: "bank", label: "Banco" },
            { key: "clabe", label: "CLABE" },
            {
              key: "bank_public",
              label: "Autorizo publicar los datos bancarios",
              type: "checkbox",
            },
            { key: "rfc", label: "RFC (opcional)" },
            {
              key: "rfc_public",
              label: "Autorizo publicar el RFC en la tarjeta pública",
              type: "checkbox",
            },
            {
              key: "psa_threshold",
              label: "Umbral de alerta PSA (ng/mL)",
              type: "number",
              min: 0.01,
              step: "any",
              required: true,
            },
          ].map((f) => (
            <FieldInput
              key={f.key}
              field={f as Field}
              value={settings[f.key]}
            />
          ))}
        </div>
        <div className="stack">
          {branches.map((b) => (
            <div className="card" key={String(b.id)}>
              <h2>{String(b.name)}</h2>
              {["address", "hours", "maps_url"].map((field, i) => (
                <FieldInput
                  key={field}
                  field={{
                    key: `${b.id}_${field}`,
                    label: ["Dirección", "Horarios", "Enlace de Google Maps"][
                      i
                    ],
                  }}
                  value={b[field]}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <Feedback state={state} />
      <p className="small quiet">
        Los datos bancarios y el RFC permanecen ocultos en la página pública
        hasta activar su casilla de autorización.
      </p>
      <button disabled={pending}>Guardar configuración</button>
    </form>
  );
}
