import test from "node:test";
import assert from "node:assert/strict";
import { buildSafeCalendarEvent } from "../supabase/functions/_shared/calendar-event-policy.mjs";

const base = {
  id: "appointment-123",
  branch: "Zamora",
  starts_at: "2026-10-20T16:00:00.000Z",
  ends_at: "2026-10-20T16:30:00.000Z",
  status: "Agendada",
  patient_name: "NOMBRE CONFIDENCIAL",
  phone: "5551234567",
  diagnosis: "DATO CLÍNICO",
  notes: "NOTA CLÍNICA"
};

test("emits only generic, branch-labelled calendar event with opaque appointment mapping", () => {
  const event = buildSafeCalendarEvent(base);
  assert.equal(event.summary, "Cita UROMED");
  assert.equal(event.location, "Zamora");
  assert.equal(event.extendedProperties.private.uromedAppointmentId, "appointment-123");
  assert.equal(event.start.dateTime, "2026-10-20T16:00:00.000Z");
  assert.equal(event.end.dateTime, "2026-10-20T16:30:00.000Z");
  const serialized = JSON.stringify(event);
  for (const forbidden of ["NOMBRE CONFIDENCIAL", "5551234567", "DATO CLÍNICO", "NOTA CLÍNICA"]) {
    assert.equal(serialized.includes(forbidden), false, `leaked sensitive field: ${forbidden}`);
  }
});

test("requires an explicit supported branch; never infers branch from title or date", () => {
  assert.throws(() => buildSafeCalendarEvent({ ...base, branch: "" }), /valid UROMED branch/);
  assert.throws(() => buildSafeCalendarEvent({ ...base, branch: "Consultorio Centro" }), /valid UROMED branch/);
});

test("rejects missing appointment id and invalid start", () => {
  assert.throws(() => buildSafeCalendarEvent({ ...base, id: "" }), /id is required/);
  assert.throws(() => buildSafeCalendarEvent({ ...base, starts_at: "not-a-date" }), /start time is required/);
});

test("rejects an end time that is not after the start", () => {
  assert.throws(() => buildSafeCalendarEvent({ ...base, ends_at: base.starts_at }), /after start time/);
});

test("defaults to 30 minutes and maps cancellation to a Google cancellation", () => {
  const event = buildSafeCalendarEvent({ ...base, ends_at: null, status: "Canceló" });
  assert.equal(event.end.dateTime, "2026-10-20T16:30:00.000Z");
  assert.equal(event.status, "cancelled");
});
