import { z } from "zod";
import { modules } from "./modules";
import { localToISO } from "./time";
const uuid = z.string().uuid();
export function validate(module: string, form: FormData) {
  const config = modules[module];
  if (!config) throw new Error("Módulo inválido");
  const data: Record<string, unknown> = {};
  for (const f of config.fields) {
    const raw = String(form.get(f.key) ?? "").trim();
    if (f.type === "checkbox") {
      data[f.key] = form.get(f.key) === "on";
      continue;
    }
    if (f.required && !raw) throw new Error(`Falta ${f.label}`);
    if (!raw) {
      if (
        [
          "birth_date",
          "amendment_to",
          "numeric_value",
          "free",
          "next_review",
          "next_date",
        ].includes(f.key)
      )
        data[f.key] = null;
      else if (f.type !== "date" && f.type !== "datetime-local")
        data[f.key] = "";
      continue;
    }
    if (raw.length > 20000) throw new Error("Texto demasiado extenso");
    if (f.options && !f.options.includes(raw))
      throw new Error(`${f.label} inválido`);
    if (
      (f.key.endsWith("_id") && f.key !== "branch_id") ||
      f.key === "amendment_to"
    )
      uuid.parse(raw);
    if (f.type === "number") {
      const v = Number(raw);
      if (
        !Number.isFinite(v) ||
        (f.min !== undefined && v < f.min) ||
        (f.max !== undefined && v > f.max) ||
        (f.step === "1" && !Number.isInteger(v))
      )
        throw new Error(`${f.label} inválido`);
      data[f.key] = v;
    } else if (f.type === "datetime-local") {
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw))
        throw new Error("Fecha inválida");
      data[f.key] = localToISO(raw);
    } else if (f.type === "date") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(Date.parse(raw)))
        throw new Error("Fecha inválida");
      data[f.key] = raw;
    } else data[f.key] = raw;
  }
  if (module === "agenda") {
    if (new Date(data.ends_at as string) <= new Date(data.starts_at as string))
      throw new Error("La hora final debe ser posterior a la inicial");
    data.sync_status = "pendiente";
    data.pending_link = false;
  }
  if (
    module === "psa" &&
    data.free !== null &&
    Number(data.free) > Number(data.total)
  )
    throw new Error("El PSA libre no puede ser mayor al total");
  if (module === "pacientes")
    z.string()
      .regex(/^[0-9+ ()-]{7,25}$/)
      .parse(data.phone);
  if (module === "inventario") data.quantity = data.initial_quantity;
  return data;
}
