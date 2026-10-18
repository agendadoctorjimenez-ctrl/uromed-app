import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
const doctor = "11111111-1111-4111-8111-111111111111",
  assistant = "22222222-2222-4222-8222-222222222222",
  stranger = "33333333-3333-4333-8333-333333333333",
  patient = "44444444-4444-4444-8444-444444444444",
  lot = "55555555-5555-4555-8555-555555555555";
let db: PGlite;
async function role(id: string | null, role = "authenticated") {
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub','${id ?? ""}',false); set role ${role};`,
  );
}
beforeAll(async () => {
  db = new PGlite({ extensions: { btree_gist } });
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create schema storage; create schema extensions;
 create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to anon,authenticated,service_role; grant execute on function auth.uid() to anon,authenticated,service_role;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
 create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name,'/') $$;
 grant usage on schema storage to authenticated;grant select,insert on storage.objects to authenticated;
 create publication supabase_realtime;
 insert into auth.users values('${doctor}'),('${assistant}'),('${stranger}');`);
  await db.exec(readFileSync("sql/01-schema.sql", "utf8"));
  await db.exec(
    `insert into public.profiles(id,name,role) values('${doctor}','Doctor','medico'),('${assistant}','Asistente','asistente');`,
  );
  await role(doctor);
  await db.exec(`insert into patients(id,name,phone,branch_id) values('${patient}','Paciente sintético','3521234567','LP');
 insert into inventory_lots(id,item,kind,lot,expires_on,branch_id,initial_quantity,quantity) values('${lot}','Gardasil 9','vacuna','TEST','2099-12-31','LP',2,2);`);
});
afterAll(async () => {
  await db.close();
});
describe("SQL real sobre PostgreSQL local (Auth y Storage simulados)", () => {
  it("público no consulta pacientes, notas ni tokens", async () => {
    await role(null, "anon");
    await expect(db.query("select * from patients")).rejects.toThrow();
    await expect(
      db.query("select * from calendar_connection"),
    ).rejects.toThrow();
    expect((await db.query("select * from public_card")).rows.length).toBe(1);
  });
  it("oculta datos bancarios hasta publicación autorizada", async () => {
    await role(doctor);
    await db.exec(
      "update site_settings set beneficiary='Prueba',bank='Prueba',clabe='123456789012345678',bank_public=false where id=1;",
    );
    await role(null, "anon");
    const r = await db.query<{ clabe: string | null }>(
      "select clabe from public_card",
    );
    expect(r.rows[0].clabe).toBeNull();
  });
  it("usuario sin perfil activo no ve pacientes", async () => {
    await role(stranger);
    expect((await db.query("select * from patients")).rows).toHaveLength(0);
  });
  it("asistente ve datos administrativos pero no notas clínicas", async () => {
    await role(assistant);
    expect((await db.query("select * from patients")).rows).toHaveLength(1);
    expect((await db.query("select * from medical_notes")).rows).toHaveLength(
      0,
    );
    await expect(
      db.exec(
        `insert into medical_notes(patient_id,reason)values('${patient}','No autorizado')`,
      ),
    ).rejects.toThrow();
  });
  it("asistente no eleva su rol ni cambia saldo directo", async () => {
    await role(assistant);
    await expect(
      db.exec(`update profiles set role='medico' where id='${assistant}'`),
    ).rejects.toThrow();
    await expect(
      db.exec(`update inventory_lots set quantity=100 where id='${lot}'`),
    ).rejects.toThrow();
  });
  it("cita duplicada o solapada se rechaza entre sucursales", async () => {
    await role(assistant);
    await db.exec(
      `insert into appointments(patient_id,branch_id,starts_at,ends_at)values('${patient}','LP','2090-01-01T15:00Z','2090-01-01T15:30Z')`,
    );
    await expect(
      db.exec(
        `insert into appointments(patient_id,branch_id,starts_at,ends_at)values('${patient}','ZAM','2090-01-01T15:10Z','2090-01-01T15:40Z')`,
      ),
    ).rejects.toThrow();
  });
  it("nota cerrada no admite modificación, eliminación o autor diferente", async () => {
    await role(doctor);
    const n = await db.query<{ id: string }>(
      `insert into medical_notes(patient_id,reason,closed_at) values('${patient}','Consulta sintética',now()) returning id`,
    );
    await expect(
      db.exec(
        `update medical_notes set reason='Cambiar' where id='${n.rows[0].id}'`,
      ),
    ).rejects.toThrow();
    await expect(
      db.exec(`delete from medical_notes where id='${n.rows[0].id}'`),
    ).rejects.toThrow();
    await db.exec(
      `insert into medical_notes(patient_id,reason,amendment_to)values('${patient}','Enmienda sintética','${n.rows[0].id}')`,
    );
  });
  it("aplicación idempotente descuenta una sola vez y crea un solo movimiento", async () => {
    await role(assistant);
    const key = "66666666-6666-4666-8666-666666666666";
    const query = `select record_application('${patient}','${lot}','vacuna','1',now(),null,'Asistente','${key}')`;
    const a = await db.query(query),
      b = await db.query(query);
    expect(a.rows).toEqual(b.rows);
    const r = await db.query<{ quantity: number }>(
      `select quantity from inventory_lots where id='${lot}'`,
    );
    expect(r.rows[0].quantity).toBe(1);
    expect(
      (await db.query("select * from inventory_movements")).rows,
    ).toHaveLength(1);
  });
  it("no descuenta si el lote está agotado; operación se revierte", async () => {
    await role(doctor);
    await db.exec(`select adjust_stock('${lot}',-1,'Salida de prueba')`);
    await role(assistant);
    await expect(
      db.exec(
        `select record_application('${patient}','${lot}','vacuna','2',now(),null,'Asistente',gen_random_uuid())`,
      ),
    ).rejects.toThrow("existencias");
    expect((await db.query("select * from applications")).rows).toHaveLength(1);
  });
  it("archivos privados no accesibles al asistente", async () => {
    await role(doctor);
    await db.exec(
      `insert into storage.objects(bucket_id,name)values('clinical','${patient}/test.pdf')`,
    );
    expect((await db.query("select * from storage.objects")).rows).toHaveLength(
      1,
    );
    await role(assistant);
    expect((await db.query("select * from storage.objects")).rows).toHaveLength(
      0,
    );
  });
  it("revocar perfil bloquea el acceso aunque conserve JWT", async () => {
    await role(null);
    await db.exec("reset role");
    await db.exec(`update profiles set active=false where id='${assistant}'`);
    await role(assistant);
    expect((await db.query("select * from patients")).rows).toHaveLength(0);
  });
  it("auditoría registra actores y cambios", async () => {
    await role(doctor);
    const rows = await db.query<{ actor_id: string }>(
      "select * from audit_log",
    );
    expect(rows.rows.some((r) => r.actor_id === doctor)).toBe(true);
  });
});
