"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function SyncButton() {
  const [busy, setBusy] = useState(false),
    [msg, setMsg] = useState("");
  const router = useRouter();
  return (
    <>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await fetch("/api/calendar/sync", { method: "POST" });
            const result = await r.json();
            setMsg(
              r.ok
                ? result.status === "ejecutado"
                  ? "Proceso ejecutado. Revisa pendientes y conflictos."
                  : "Sin conexión o proceso ya en curso."
                : result.error,
            );
            router.refresh();
          } catch {
            setMsg("No se pudo conectar.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Sincronizando…" : "Sincronizar ahora"}
      </button>
      <p aria-live="polite" className="small quiet">
        {msg}
      </p>
    </>
  );
}
export function ResolveButtons({ id }: { id: string }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <>
      <div className="row">
        {(["google", "uromed"] as const).map((choice) => (
          <button
            className="secondary"
            key={choice}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await fetch("/api/calendar/resolve", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id, choice }),
                });
                setMsg(
                  r.ok
                    ? "Conflicto resuelto. Sincroniza para publicar cambios."
                    : await r.text(),
                );
                router.refresh();
              } catch {
                setMsg("No se pudo resolver.");
              } finally {
                setBusy(false);
              }
            }}
          >
            Conservar {choice === "google" ? "Google" : "UROMED"}
          </button>
        ))}
      </div>
      <p className="small quiet" aria-live="polite">
        {msg}
      </p>
    </>
  );
}
