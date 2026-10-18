import { describe, it, expect } from "vitest";
import { localToISO, localInput } from "../lib/time";
import {
  toGoogle,
  branchFromEvent,
  eventId,
  changedExternally,
  type Appointment,
} from "../lib/calendar-model";
import { validate } from "../lib/validation";
import { encrypt, decrypt, safeEqual } from "../lib/crypto";
const appointment: Appointment = {
  id: "9c617b34-20ab-4dba-b9f5-e0746377998a",
  patient_id: "private-patient",
  branch_id: "LP",
  title: "Diagnóstico privado",
  starts_at: "2026-10-13T15:00:00Z",
  ends_at: "2026-10-13T15:30:00Z",
  status: "confirmada",
  sync_status: "pendiente",
  updated_at: "2026-10-13T14:00:00Z",
  google_etag: "old",
};
describe("Horarios e integración", () => {
  it("preserva hora local de México sin depender de TZ del servidor", () => {
    expect(localToISO("2026-10-13T09:00")).toBe("2026-10-13T15:00:00.000Z");
    expect(localInput("2026-10-13T15:00:00Z")).toBe("2026-10-13T09:00");
  });
  it("exporta solo horario, sucursal y estado, sin paciente ni texto clínico", () => {
    const out = toGoogle(appointment);
    expect(JSON.stringify(out)).not.toContain("private-patient");
    expect(JSON.stringify(out)).not.toContain("Diagnóstico");
    expect(out.summary).toContain("La Piedad");
  });
  it("evento id estable para reintentos y válido base32hex", () => {
    expect(eventId(appointment.id)).toMatch(/^[0-9a-v]{5,1024}$/);
    expect(eventId(appointment.id)).toBe(eventId(appointment.id));
  });
  it("no adivina sucursal", () => {
    expect(
      branchFromEvent({ id: "1", summary: "Juan en consultorio" }),
    ).toBeNull();
    expect(branchFromEvent({ id: "1", summary: "[ZAM] Consulta" })).toBe("ZAM");
  });
  it("detecta conflicto remoto", () => {
    expect(changedExternally(appointment, { id: "1", etag: "new" })).toBe(true);
  });
});
describe("Validación", () => {
  it("rechaza fin anterior al inicio", () => {
    const f = new FormData();
    for (const [k, v] of Object.entries({
      patient_id: appointment.id,
      branch_id: "LP",
      title: "Consulta",
      starts_at: "2026-10-13T10:00",
      ends_at: "2026-10-13T09:00",
      status: "agendada",
    }))
      f.set(k, v);
    expect(() => validate("agenda", f)).toThrow("posterior");
  });
  it("rechaza PSA libre mayor al total", () => {
    const f = new FormData();
    for (const [k, v] of Object.entries({
      patient_id: appointment.id,
      study_date: "2026-10-13",
      total: "2",
      free: "3",
    }))
      f.set(k, v);
    expect(() => validate("psa", f)).toThrow("libre");
  });
});
describe("Cifrado autenticado", () => {
  it("cifra y recupera refresh tokens", () => {
    process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    const value = encrypt("token-de-prueba");
    expect(value).not.toContain("token-de-prueba");
    expect(decrypt(value)).toBe("token-de-prueba");
  });
  it("rechaza manipulación", () => {
    process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    const b = Buffer.from(encrypt("test"), "base64");
    b[29] ^= 1;
    expect(() => decrypt(b.toString("base64"))).toThrow();
  });
  it("compara secretos de tamaños distintos sin excepción", () => {
    expect(safeEqual("a", "ab")).toBe(false);
    expect(safeEqual("a", "a")).toBe(true);
  });
});
