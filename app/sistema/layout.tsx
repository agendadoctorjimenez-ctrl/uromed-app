import { staff } from "@/lib/auth";
import { configured } from "@/lib/supabase";
import { redirect } from "next/navigation";
import { logout } from "@/app/actions";
import { Nav } from "@/components/nav";
import { Realtime } from "@/components/realtime";
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!configured()) redirect("/login");
  const { profile } = await staff();
  return (
    <div className="shell">
      <aside className="sidebar">
        <a href="/">
          <img className="logo" src="/logo-uromed.png" alt="UROMED" />
        </a>
        <Nav doctor={profile.role === "medico"} />
        <div className="identity">
          <p className="small">
            {profile.name}
            <br />
            <span className="quiet">
              {profile.role === "medico"
                ? "Médico administrador"
                : "Asistente administrativo"}
            </span>
          </p>
          <form action={logout}>
            <button className="secondary">Cerrar sesión</button>
          </form>
        </div>
      </aside>
      <main className="private">
        <div className="row between small quiet" style={{ marginBottom: 20 }}>
          <span>UROMED CLÍNICO · LA PIEDAD / ZAMORA</span>
          <form action={logout}>
            <button className="secondary">Salir</button>
          </form>
        </div>
        {children}
        <Realtime />
      </main>
    </div>
  );
}
