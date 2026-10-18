"use client";
import { usePathname } from "next/navigation";
import { modules } from "@/lib/modules";
export function Nav({ doctor }: { doctor: boolean }) {
  const path = usePathname();
  return (
    <nav>
      <a className={path === "/sistema" ? "active" : ""} href="/sistema">
        Panel principal
      </a>
      {Object.entries(modules)
        .filter(([, m]) => !m.doctor || doctor)
        .map(([key, m]) => (
          <a
            key={key}
            className={path === `/sistema/${key}` ? "active" : ""}
            href={`/sistema/${key}`}
          >
            {m.title}
          </a>
        ))}
      {doctor && (
        <a
          href="/sistema/configuracion"
          className={path.includes("configuracion") ? "active" : ""}
        >
          Configuración
        </a>
      )}
    </nav>
  );
}
