import { db, configured } from "@/lib/supabase";
import { Copy } from "@/components/copy";
export const dynamic = "force-dynamic";
export default async function Page() {
  let card = {
    biography: "Atención urológica en La Piedad y Zamora.",
    services:
      "Consulta de urología;Próstata;Litiasis;Cirugía urológica;Salud sexual;Vacunación VPH",
    rfc: null as string | null,
    beneficiary: null as string | null,
    bank: null as string | null,
    clabe: null as string | null,
  };
  let branches = [
    {
      id: "LP",
      name: "La Piedad",
      phone: "3521327669",
      address: "Enrique Ramírez #57-A, frente al Hospital del Carmen",
      hours: "",
      maps_url: "",
    },
    {
      id: "ZAM",
      name: "Zamora",
      phone: "3511502304",
      address: "Aquiles Serdán Sur #93, esquina con Colón",
      hours: "",
      maps_url: "",
    },
  ];
  if (configured()) {
    const client = await db();
    const [{ data: c }, { data: b }] = await Promise.all([
      client.from("public_card").select("*").single(),
      client.from("branches").select("*").order("id"),
    ]);
    if (c) card = c;
    if (b) branches = b;
  }
  return (
    <div className="public">
      <header className="row between">
        <span className="eyebrow">Urología · Michoacán</span>
        <a className="quiet small" href="/login">
          Acceso al consultorio ↗
        </a>
      </header>
      <section className="hero">
        <img
          className="logo"
          src="/logo-uromed.png"
          alt="UROMED — La Urología a tu Alcance"
        />
        <span className="eyebrow">Dr. Israel Jiménez Heredia</span>
        <h1>
          Atención cercana.
          <br />
          Urología especializada.
        </h1>
        <p className="quiet">{card.biography}</p>
        <div className="row">
          <a
            className="btn"
            href="https://wa.me/523511502304"
            target="_blank"
            rel="noopener noreferrer"
          >
            Solicitar una cita
          </a>
          <a className="btn secondary" href="#sucursales">
            Ver consultorios ↓
          </a>
        </div>
      </section>
      <section className="card">
        <h2>Servicios urológicos</h2>
        <div className="row">
          {card.services
            .split(";")
            .filter(Boolean)
            .map((s) => (
              <span className="badge" key={s}>
                {s}
              </span>
            ))}
        </div>
      </section>
      <section id="sucursales" className="section-gap">
        <h2>Dos sedes. La misma atención.</h2>
        <div className="grid two">
          {branches.map((b) => (
            <article className="card" key={b.id}>
              <span className="eyebrow">Consultorio</span>
              <h2>{b.name}</h2>
              <p>{b.address || "Consulta la ubicación al agendar tu cita."}</p>
              <p className="quiet">{b.hours || "Atención con cita previa."}</p>
              <p>{b.phone}</p>
              <div className="row">
                <a
                  className="btn"
                  href={`https://wa.me/52${b.phone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp
                </a>
                <a className="btn secondary" href={`tel:+52${b.phone}`}>
                  Llamar
                </a>
                {b.maps_url && (
                  <a
                    className="btn secondary"
                    href={b.maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Google Maps ↗
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
      {card.clabe && (
        <section className="card section-gap">
          <h2>Datos para transferencia</h2>
          <p>
            {card.beneficiary} · {card.bank}
          </p>
          <p>
            <b>{card.clabe}</b>
          </p>
          <Copy value={card.clabe} />
        </section>
      )}
      {card.rfc && (
        <section className="card section-gap">
          <h2>RFC</h2>
          <p><b>{card.rfc}</b></p>
        </section>
      )}
      <footer>
        © UROMED · Dr. Israel Jiménez Heredia · La Urología a tu Alcance
      </footer>
    </div>
  );
}
