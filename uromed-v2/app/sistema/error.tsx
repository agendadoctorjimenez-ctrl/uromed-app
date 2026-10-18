"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="card">
      <h1>No pudimos abrir esta sección.</h1>
      <p>
        Comprueba tus permisos y la configuración de Supabase. No se muestran
        datos clínicos en el mensaje de error.
      </p>
      <button onClick={reset}>Reintentar</button>
    </div>
  );
}
