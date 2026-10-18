import { configured } from "@/lib/supabase";
import { LoginForm } from "@/components/forms";
export const dynamic = "force-dynamic";
export default function Page() {
  return (
    <div className="login">
      <a href="/">
        <img className="logo" src="/logo-uromed.png" alt="UROMED" />
      </a>
      <div className="card">
        <span className="eyebrow">Sistema privado</span>
        <h1>Bienvenido.</h1>
        <p className="quiet">Acceso exclusivo al equipo del consultorio.</p>
        {configured() ? (
          <LoginForm />
        ) : (
          <p className="error">
            Falta configurar el proyecto Supabase nuevo. Consulta
            INICIAR_AQUI.html incluido en la entrega.
          </p>
        )}
      </div>
      <p className="small quiet">
        Las cuentas las crea el administrador. No existe registro público.
      </p>
    </div>
  );
}
