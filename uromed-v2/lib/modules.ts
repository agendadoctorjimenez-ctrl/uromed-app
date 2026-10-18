export type Field = {
  key: string;
  label: string;
  type?:
    | "text"
    | "textarea"
    | "number"
    | "date"
    | "datetime-local"
    | "select"
    | "checkbox";
  required?: boolean;
  options?: string[];
  min?: number;
  max?: number;
  step?: string;
};
export type Module = {
  table: string;
  title: string;
  description: string;
  doctor?: boolean;
  fields: Field[];
  columns: string[];
};
const patient: Field = {
  key: "patient_id",
  label: "Paciente",
  type: "select",
  required: true,
};
const branch: Field = {
  key: "branch_id",
  label: "Sucursal",
  type: "select",
  required: true,
  options: ["LP", "ZAM"],
};
const text = (key: string, label: string, required = false): Field => ({
  key,
  label,
  required,
});
const area = (key: string, label: string): Field => ({
  key,
  label,
  type: "textarea",
});
const date = (key: string, label: string, required = false): Field => ({
  key,
  label,
  type: "date",
  required,
});
export const modules: Record<string, Module> = {
  pacientes: {
    table: "patients",
    title: "Pacientes",
    description: "Datos generales y acceso al expediente individual.",
    fields: [
      text("name", "Nombre completo", true),
      text("phone", "Teléfono", true),
      date("birth_date", "Fecha de nacimiento"),
      {
        key: "sex",
        label: "Sexo",
        type: "select",
        options: ["No especificado", "Femenino", "Masculino", "Otro"],
      },
      text("contact", "Contacto de emergencia"),
      branch,
      { key: "archived", label: "Archivado", type: "checkbox" },
    ],
    columns: ["folio", "name", "phone", "branch_id"],
  },
  agenda: {
    table: "appointments",
    title: "Agenda",
    description: "Un médico · dos sucursales · horario de Ciudad de México.",
    fields: [
      patient,
      branch,
      text("title", "Título administrativo", true),
      {
        key: "starts_at",
        label: "Inicio",
        type: "datetime-local",
        required: true,
      },
      { key: "ends_at", label: "Fin", type: "datetime-local", required: true },
      {
        key: "status",
        label: "Estado",
        type: "select",
        options: [
          "agendada",
          "confirmada",
          "atendida",
          "cancelada",
          "no asistió",
        ],
      },
      area("admin_notes", "Notas administrativas (sin diagnósticos)"),
    ],
    columns: ["starts_at", "patient_id", "branch_id", "status", "sync_status"],
  },
  notas: {
    table: "medical_notes",
    title: "Notas clínicas",
    description:
      "Los registros cerrados se conservan; las correcciones se añaden como enmiendas.",
    doctor: true,
    fields: [
      patient,
      text("amendment_to", "ID de nota cerrada a enmendar (opcional)"),
      area("family_history", "Antecedentes heredofamiliares"),
      area("medical_history", "Antecedentes médicos"),
      area("surgical_history", "Antecedentes quirúrgicos"),
      area("allergies", "Alergias"),
      area("medicines", "Medicamentos"),
      {
        key: "reason",
        label: "Motivo de consulta",
        type: "textarea",
        required: true,
      },
      area("present_illness", "Padecimiento actual"),
      area("examination", "Exploración física"),
      area("diagnosis", "Diagnósticos"),
      area("treatment", "Tratamiento"),
      area("instructions", "Indicaciones"),
      area("evolution", "Nota de evolución"),
    ],
    columns: ["created_at", "patient_id", "reason", "closed_at", "author_id"],
  },
  laboratorios: {
    table: "laboratories",
    title: "Laboratorios",
    description:
      "Resultados y antecedentes. Adjunta archivos desde el expediente.",
    doctor: true,
    fields: [
      patient,
      text("study", "Estudio", true),
      date("study_date", "Fecha", true),
      text("laboratory", "Laboratorio"),
      {
        key: "numeric_value",
        label: "Resultado numérico",
        type: "number",
        step: "any",
      },
      area("descriptive_value", "Resultado descriptivo"),
      text("units", "Unidades"),
      text("reference_range", "Rango de referencia"),
      area("observations", "Observaciones"),
    ],
    columns: ["study_date", "patient_id", "study", "numeric_value", "units"],
  },
  psa: {
    table: "psa",
    title: "PSA",
    description:
      "Historial y alertas de revisión. No realiza diagnósticos automáticos.",
    doctor: true,
    fields: [
      patient,
      date("study_date", "Fecha de estudio", true),
      {
        key: "total",
        label: "PSA total (ng/mL)",
        type: "number",
        required: true,
        min: 0,
        step: "any",
      },
      {
        key: "free",
        label: "PSA libre (ng/mL)",
        type: "number",
        min: 0,
        step: "any",
      },
      text("laboratory", "Laboratorio"),
      date("next_review", "Próxima revisión"),
      area("observations", "Observaciones"),
      { key: "reviewed", label: "Revisado por médico", type: "checkbox" },
    ],
    columns: ["study_date", "patient_id", "total", "free", "reviewed"],
  },
  seguimientos: {
    table: "followups",
    title: "Seguimientos",
    description: "Pendientes administrativos vinculados al paciente.",
    fields: [
      patient,
      date("due_date", "Fecha", true),
      text("reason", "Motivo administrativo", true),
      {
        key: "priority",
        label: "Prioridad",
        type: "select",
        options: ["normal", "alta", "urgente"],
      },
      text("responsible", "Responsable"),
      area("observations", "Observaciones administrativas"),
      {
        key: "status",
        label: "Estado",
        type: "select",
        options: ["pendiente", "completado", "cancelado"],
      },
    ],
    columns: ["due_date", "patient_id", "reason", "priority", "status"],
  },
  cirugias: {
    table: "surgeries",
    title: "Cirugías",
    description:
      "Programación, pendientes, notas y seguimiento postoperatorio.",
    doctor: true,
    fields: [
      patient,
      branch,
      text("diagnosis", "Diagnóstico"),
      text("procedure", "Procedimiento", true),
      {
        key: "surgery_date",
        label: "Fecha y hora",
        type: "datetime-local",
        required: true,
      },
      text("hospital", "Hospital"),
      {
        key: "status",
        label: "Estado",
        type: "select",
        options: ["programada", "realizada", "cancelada"],
      },
      area("preop", "Estudios preoperatorios"),
      area("pending", "Pendientes"),
      area("surgical_note", "Nota de cirugía"),
      area("postoperative", "Seguimiento postoperatorio"),
      {
        key: "payment",
        label: "Anticipo / pago registrado (MXN)",
        type: "number",
        min: 0,
        step: "0.01",
      },
    ],
    columns: ["surgery_date", "patient_id", "procedure", "hospital", "status"],
  },
  inventario: {
    table: "inventory_lots",
    title: "Inventario",
    description: "Lotes, existencias y caducidades. Movimientos auditados.",
    fields: [
      text("item", "Producto", true),
      {
        key: "kind",
        label: "Tipo",
        type: "select",
        options: ["vacuna", "zoladex", "insumo", "medicamento"],
      },
      text("presentation", "Presentación"),
      text("lot", "Lote", true),
      date("expires_on", "Caducidad", true),
      branch,
      {
        key: "initial_quantity",
        label: "Existencia inicial",
        type: "number",
        required: true,
        min: 0,
        step: "1",
      },
      {
        key: "minimum",
        label: "Umbral de alerta",
        type: "number",
        required: true,
        min: 0,
        step: "1",
      },
    ],
    columns: [
      "item",
      "presentation",
      "lot",
      "expires_on",
      "quantity",
      "branch_id",
    ],
  },
  vacunas: {
    table: "applications",
    title: "Vacunas",
    description:
      "Padrón nuevo. Confirma una aplicación para descontar una unidad del lote.",
    fields: [
      patient,
      {
        key: "lot_id",
        label: "Lote de Gardasil 9",
        type: "select",
        required: true,
      },
      text("dose", "Dosis y esquema indicado", true),
      {
        key: "applied_at",
        label: "Fecha y hora de aplicación",
        type: "datetime-local",
        required: true,
      },
      date("next_date", "Próxima aplicación"),
      text("responsible", "Responsable", true),
    ],
    columns: ["applied_at", "patient_id", "lot_id", "dose", "next_date"],
  },
  zoladex: {
    table: "applications",
    title: "Zoladex",
    description: "Aplicaciones, presentación, lotes y próxima revisión.",
    fields: [
      patient,
      {
        key: "lot_id",
        label: "Lote y presentación",
        type: "select",
        required: true,
      },
      text("dose", "Dosis indicada", true),
      {
        key: "applied_at",
        label: "Fecha y hora de aplicación",
        type: "datetime-local",
        required: true,
      },
      date("next_date", "Próxima aplicación"),
      text("responsible", "Responsable", true),
    ],
    columns: ["applied_at", "patient_id", "lot_id", "dose", "next_date"],
  },
};
export const labels: Record<string, string> = {
  folio: "Folio",
  name: "Nombre",
  phone: "Teléfono",
  branch_id: "Sucursal",
  patient_id: "Paciente",
  starts_at: "Inicio",
  status: "Estado",
  sync_status: "Google",
  created_at: "Fecha",
  reason: "Motivo",
  closed_at: "Cierre",
  author_id: "Profesional",
  study_date: "Fecha",
  study: "Estudio",
  numeric_value: "Resultado",
  units: "Unidades",
  total: "Total",
  free: "Libre",
  reviewed: "Revisado",
  due_date: "Fecha",
  priority: "Prioridad",
  surgery_date: "Fecha",
  procedure: "Procedimiento",
  hospital: "Hospital",
  item: "Producto",
  presentation: "Presentación",
  lot: "Lote",
  expires_on: "Caducidad",
  quantity: "Existencias",
  applied_at: "Aplicación",
  lot_id: "Lote",
  dose: "Dosis",
  next_date: "Próxima",
};
