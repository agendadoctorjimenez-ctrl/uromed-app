import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { encrypt } from "../lib/crypto";
import { eventId } from "../lib/calendar-model";
const mock = vi.hoisted(() => ({
  tables: {} as Record<string, Record<string, unknown>[]>,
  lease: true,
}));
vi.mock("../lib/supabase", () => ({
  service: () => ({
    rpc: async () => ({ data: mock.lease, error: null }),
    from: (table: string) => new Query(table),
  }),
}));
class Query {
  op = "select";
  payload: Record<string, unknown>[] = [];
  filters: ((row: Record<string, unknown>) => boolean)[] = [];
  one = false;
  cap = Infinity;
  constructor(public table: string) {}
  select() {
    return this;
  }
  eq(key: string, value: unknown) {
    this.filters.push((r) =>
      key.includes("->>")
        ? (r[key.split("->>")[0]] as Record<string, unknown>)?.[
            key.split("->>")[1]
          ] === value
        : r[key] === value,
    );
    return this;
  }
  is(key: string, value: unknown) {
    return this.eq(key, value);
  }
  lte(key: string, value: unknown) {
    this.filters.push((r) => String(r[key]) <= String(value));
    return this;
  }
  order() {
    return this;
  }
  limit(n: number) {
    this.cap = n;
    return this;
  }
  single() {
    this.one = true;
    return this;
  }
  maybeSingle() {
    this.one = true;
    return this;
  }
  insert(value: Record<string, unknown> | Record<string, unknown>[]) {
    this.op = "insert";
    this.payload = Array.isArray(value) ? value : [value];
    return this;
  }
  update(value: Record<string, unknown>) {
    this.op = "update";
    this.payload = [value];
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  then(
    resolve: (value: unknown) => unknown,
    reject?: (reason: unknown) => unknown,
  ) {
    try {
      const table = mock.tables[this.table] ?? (mock.tables[this.table] = []);
      const selected = table
        .filter((r) => this.filters.every((f) => f(r)))
        .slice(0, this.cap);
      let result = selected;
      if (this.op === "insert") {
        result = this.payload.map((p) => ({ id: crypto.randomUUID(), ...p }));
        table.push(...result);
      }
      if (this.op === "update")
        selected.forEach((r) => Object.assign(r, this.payload[0]));
      if (this.op === "delete")
        mock.tables[this.table] = table.filter((r) => !selected.includes(r));
      return Promise.resolve({
        data: this.one ? (result[0] ?? null) : structuredClone(result),
        error: null,
      }).then(resolve, reject);
    } catch (e) {
      return Promise.reject(e).then(resolve, reject);
    }
  }
}
import { syncCalendar } from "../lib/google";
const id = "77777777-7777-4777-8777-777777777777";
const local = () => ({
  id,
  patient_id: "88888888-8888-4888-8888-888888888888",
  branch_id: "LP",
  title: "Texto privado",
  starts_at: "2090-01-01T15:00:00Z",
  ends_at: "2090-01-01T15:30:00Z",
  status: "agendada",
  sync_status: "pendiente",
  source: "uromed",
  google_event_id: null,
  google_etag: null,
  updated_at: "2090-01-01T14:00:00Z",
  calendar_revision: 0,
});
let events: Record<string, unknown>[],
  calls: {
    path: string;
    method: string;
    body?: Record<string, unknown>;
    headers?: HeadersInit;
  }[],
  postStatus: number,
  firstListGone: boolean;
beforeEach(() => {
  process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 8).toString("base64");
  process.env.APP_URL = "https://example.vercel.app";
  process.env.GOOGLE_CALENDAR_ID = "calendar-test";
  mock.lease = true;
  mock.tables = {
    calendar_connection: [
      {
        id: 1,
        encrypted_refresh_token: encrypt("synthetic-token"),
        sync_token: "previous",
        last_full_sync: new Date().toISOString(),
        channel_expiry: new Date(Date.now() + 48 * 3600000).toISOString(),
        channel_id: "old-channel",
        resource_id: "old-resource",
      },
    ],
    appointments: [],
    calendar_outbox: [],
    calendar_conflicts: [],
  };
  events = [];
  calls = [];
  postStatus = 200;
  firstListGone = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const method = init.method ?? "GET",
        path = new URL(input).pathname;
      const body = init.body ? Object.fromEntries([]) : undefined;
      let parsed: Record<string, unknown> | undefined;
      if (init.body && path !== "/token")
        parsed = JSON.parse(String(init.body));
      calls.push({ path, method, body: parsed ?? body, headers: init.headers });
      if (path === "/token")
        return Response.json({ access_token: "access-test" });
      if (path.endsWith("/events") && method === "GET") {
        if (firstListGone) {
          firstListGone = false;
          return new Response(null, { status: 410 });
        }
        return Response.json({ items: events, nextSyncToken: "new-sync" });
      }
      if (path.endsWith("/events") && method === "POST") {
        if (postStatus !== 200)
          return new Response(null, { status: postStatus });
        return Response.json({
          ...parsed,
          etag: "created-etag",
          status: "confirmed",
        });
      }
      if (method === "PATCH")
        return Response.json({
          ...parsed,
          id: path.split("/").at(-1),
          etag: "patched-etag",
        });
      if (method === "DELETE") return new Response(null, { status: 204 });
      if (path.endsWith("/watch"))
        return Response.json({
          resourceId: "new-resource",
          expiration: String(Date.now() + 7 * 24 * 3600000),
        });
      throw new Error(`Unexpected request ${method} ${path}`);
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());
describe("Trabajador Google con HTTP y Data API simulados (sin servicios externos)", () => {
  it("exporta una cita y limpia la cola sin exportar nombres/notas", async () => {
    mock.tables.appointments = [local()];
    mock.tables.calendar_outbox = [
      {
        appointment_id: id,
        version: local().updated_at,
        attempts: 0,
        next_attempt: "2000-01-01",
      },
    ];
    await syncCalendar();
    const posts = calls.filter(
      (c) => c.method === "POST" && c.path.endsWith("/events"),
    );
    expect(posts).toHaveLength(1);
    expect(posts[0].body?.id).toBe(eventId(id));
    expect(JSON.stringify(posts[0].body)).not.toContain("Texto privado");
    expect(mock.tables.calendar_outbox).toHaveLength(0);
    expect(mock.tables.appointments[0].sync_status).toBe("sincronizada");
  });
  it("segunda ejecución no publica otra vez lo ya sincronizado", async () => {
    mock.tables.appointments = [local()];
    mock.tables.calendar_outbox = [
      {
        appointment_id: id,
        version: local().updated_at,
        attempts: 0,
        next_attempt: "2000-01-01",
      },
    ];
    await syncCalendar();
    await syncCalendar();
    expect(
      calls.filter((c) => c.method === "POST" && c.path.endsWith("/events")),
    ).toHaveLength(1);
  });
  it("importa evento externo sin vincular paciente por título", async () => {
    events = [
      {
        id: "external",
        etag: "v1",
        status: "confirmed",
        summary: "[ZAM] Paciente sintético",
        start: { dateTime: "2090-01-02T15:00:00Z" },
        end: { dateTime: "2090-01-02T15:30:00Z" },
      },
    ];
    await syncCalendar();
    expect(mock.tables.appointments[0].branch_id).toBe("ZAM");
    expect(mock.tables.appointments[0].patient_id).toBeUndefined();
    expect(mock.tables.appointments[0].pending_link).toBe(true);
  });
  it("cambios simultáneos quedan en conflicto y no se exportan", async () => {
    mock.tables.appointments = [
      { ...local(), google_event_id: "existing", google_etag: "old" },
    ];
    mock.tables.calendar_outbox = [
      {
        appointment_id: id,
        version: local().updated_at,
        next_attempt: "2000-01-01",
        attempts: 0,
      },
    ];
    events = [
      {
        id: "existing",
        etag: "new",
        status: "confirmed",
        start: { dateTime: "2090-01-02T15:00:00Z" },
        end: { dateTime: "2090-01-02T15:30:00Z" },
      },
    ];
    await syncCalendar();
    expect(mock.tables.calendar_conflicts).toHaveLength(1);
    expect(mock.tables.appointments[0].sync_status).toBe("conflicto");
    expect(calls.some((c) => c.method === "PATCH")).toBe(false);
  });
  it("cancelación externa actualiza el estado local", async () => {
    mock.tables.appointments = [
      {
        ...local(),
        sync_status: "sincronizada",
        google_event_id: "existing",
        google_etag: "old",
      },
    ];
    events = [{ id: "existing", etag: "deleted", status: "cancelled" }];
    await syncCalendar();
    expect(mock.tables.appointments[0].status).toBe("cancelada");
  });
  it("Google 410 obliga a recuperar el listado completo", async () => {
    firstListGone = true;
    await syncCalendar();
    expect(
      calls.filter((c) => c.path.endsWith("/events") && c.method === "GET"),
    ).toHaveLength(2);
    expect(mock.tables.calendar_connection[0].sync_token).toBe("new-sync");
  });
  it("un error 429 mantiene el trabajo y programa un reintento", async () => {
    postStatus = 429;
    mock.tables.appointments = [local()];
    mock.tables.calendar_outbox = [
      {
        appointment_id: id,
        version: local().updated_at,
        attempts: 0,
        next_attempt: "2000-01-01",
      },
    ];
    await syncCalendar();
    expect(mock.tables.calendar_outbox[0].attempts).toBe(1);
    expect(
      String(mock.tables.calendar_outbox[0].next_attempt) >
        new Date().toISOString(),
    ).toBe(true);
  });
  it("no ejecuta dos trabajadores al mismo tiempo", async () => {
    mock.lease = false;
    expect(await syncCalendar()).toEqual({ status: "ocupado_o_sin_conexion" });
    expect(calls).toHaveLength(0);
  });
});
