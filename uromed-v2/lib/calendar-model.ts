export type GoogleEvent = {
  id: string;
  etag?: string;
  status?: string;
  summary?: string;
  updated?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  recurringEventId?: string;
  recurrence?: string[];
  extendedProperties?: { private?: Record<string, string> };
};
export type Appointment = {
  id: string;
  patient_id?: string | null;
  branch_id?: string | null;
  title: string;
  starts_at: string;
  ends_at: string;
  status: string;
  google_event_id?: string | null;
  google_etag?: string | null;
  sync_status: string;
  updated_at: string;
  calendar_revision?: number;
};
export function eventId(id: string, revision = 0) {
  return (
    "uro" +
    id.replaceAll("-", "").toLowerCase() +
    (revision ? "r" + revision.toString(16) : "")
  );
}
export function toGoogle(a: Appointment) {
  return {
    summary: `Consulta UROMED · ${a.branch_id === "LP" ? "La Piedad" : a.branch_id === "ZAM" ? "Zamora" : "Sucursal pendiente"}`,
    start: { dateTime: a.starts_at, timeZone: "America/Mexico_City" },
    end: { dateTime: a.ends_at, timeZone: "America/Mexico_City" },
    extendedProperties: {
      private: {
        uromed_id: a.id,
        branch_id: a.branch_id ?? "",
        uromed_status: a.status,
      },
    },
  };
  // No nombres, teléfonos, diagnósticos, notas clínicas ni administrativas salen hacia Google.
}
export function branchFromEvent(e: GoogleEvent) {
  const id = e.extendedProperties?.private?.branch_id;
  if (id === "LP" || id === "ZAM") return id;
  if (/\[LP\]/i.test(e.summary ?? "")) return "LP";
  if (/\[ZAM\]/i.test(e.summary ?? "")) return "ZAM";
  return null;
}
export function changedExternally(a: Appointment, e: GoogleEvent) {
  return Boolean(a.google_etag && e.etag !== a.google_etag);
}
