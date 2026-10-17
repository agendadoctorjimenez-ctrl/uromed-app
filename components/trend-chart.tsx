export function TrendChart({
  values,
  units,
  threshold,
}: {
  values: { date: string; value: number }[];
  units: string;
  threshold?: number;
}) {
  if (!values.length) return <p className="quiet">Sin valores registrados.</p>;
  const ordered = [...values].sort((a, b) => a.date.localeCompare(b.date));
  const dates = ordered.map((v) => Date.parse(v.date));
  const span = Math.max(1, dates.at(-1)! - dates[0]);
  const maximum = Math.max(
    threshold ? threshold * 1.2 : 0,
    ...ordered.map((v) => v.value * 1.2),
    1,
  );
  const minimum = Math.min(0, ...ordered.map((v) => v.value * 1.2));
  const x = (i: number) =>
    ordered.length === 1 ? 150 : 32 + ((dates[i] - dates[0]) / span) * 236;
  const y = (v: number) => 140 - ((v - minimum) / (maximum - minimum)) * 110;
  return (
    <figure>
      <svg
        viewBox="0 0 300 175"
        className="graph"
        role="img"
        aria-label={`Evolución de resultados en ${units}`}
      >
        <line x1="32" y1="140" x2="270" y2="140" stroke="#ddd" />
        {threshold !== undefined && (
          <>
            <line
              x1="32"
              y1={y(threshold)}
              x2="270"
              y2={y(threshold)}
              stroke="#999"
              strokeDasharray="4 4"
            />
            <text x="32" y={y(threshold) - 6} fontSize="9" fill="#777">
              Revisión: {threshold} {units}
            </text>
          </>
        )}
        <polyline
          points={ordered.map((v, i) => `${x(i)},${y(v.value)}`).join(" ")}
          fill="none"
          stroke="#17324d"
          strokeWidth="2"
        />
        {ordered.map((v, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(v.value)} r="4" fill="#17324d">
              <title>
                {v.date}: {v.value} {units}
              </title>
            </circle>
            {ordered.length <= 8 && (
              <text
                x={x(i)}
                y={y(v.value) - 8}
                textAnchor="middle"
                fontSize="10"
              >
                {v.value}
              </text>
            )}
          </g>
        ))}
        <text x="32" y="160" textAnchor="start" fontSize="9">
          {ordered[0].date}
        </text>
        {ordered.length > 1 && (
          <text x="270" y="160" textAnchor="end" fontSize="9">
            {ordered.at(-1)!.date}
          </text>
        )}
      </svg>
      <figcaption className="small quiet">
        Eje horizontal: fechas de estudio. Valores en {units}.
        {threshold !== undefined
          ? " El umbral indica revisión, no diagnóstico."
          : ""}
      </figcaption>
    </figure>
  );
}
