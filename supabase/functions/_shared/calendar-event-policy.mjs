/**
 * Calendar-safe event projection for UROMED.
 *
 * Google Calendar is shared by La Piedad and Zamora. Never send patient names,
 * phone numbers, diagnoses, notes, procedures, or other clinical data.
 * This helper only builds a sanitized payload; OAuth, webhook processing,
 * conflict resolution and persistence must be implemented by the calling service.
 */
const BRANCHES = new Set(["La Piedad", "Zamora"]);
const CANCELLED_STATUSES = new Set(["Canceló", "Cancelada", "Cancelado", "cancelled", "canceled"]);

export function buildSafeCalendarEvent(appointment) {
  if (!appointment || typeof appointment !== "object") {
    throw new TypeError("Appointment is required");
  }
  const id = typeof appointment.id === "string" ? appointment.id.trim() : "";
  if (!id) throw new TypeError("Appointment id is required");

  const branch = typeof appointment.branch === "string" ? appointment.branch.trim() : "";
  if (!BRANCHES.has(branch)) throw new TypeError("A valid UROMED branch is required");

  const start = new Date(appointment.starts_at);
  if (!appointment.starts_at || Number.isNaN(start.getTime())) {
    throw new TypeError("A valid appointment start time is required");
  }

  const end = appointment.ends_at ? new Date(appointment.ends_at) : new Date(start.getTime() + 30 * 60 * 1000);
  if (Number.isNaN(end.getTime()) || end <= start) {
    throw new TypeError("Appointment end time must be after start time");
  }

  const isCancelled = CANCELLED_STATUSES.has(String(appointment.status ?? "").trim());
  return {
    summary: "Cita UROMED",
    location: branch,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
    status: isCancelled ? "cancelled" : "confirmed",
    extendedProperties: {
      private: { uromedAppointmentId: id }
    }
  };
}

export const UROMED_CALENDAR_BRANCHES = Object.freeze([...BRANCHES]);
