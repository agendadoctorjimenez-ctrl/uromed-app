import { prettyDate, localInput, localToISO, today } from "@/lib/time";
import {
  addDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  format,
} from "date-fns";
import type { Row } from "@/components/forms";
export function Calendar({
  rows,
  view,
  date,
}: {
  rows: Row[];
  view: string;
  date: string;
}) {
  const selected = new Date((date || today()) + "T12:00:00");
  if (Number.isNaN(selected.getTime())) return <p>Fecha inválida.</p>;
  let start = selected,
    end = selected;
  if (view === "mes") {
    start = startOfWeek(startOfMonth(selected), { weekStartsOn: 1 });
    end = endOfWeek(endOfMonth(selected), { weekStartsOn: 1 });
  }
  if (view === "semana") {
    start = startOfWeek(selected, { weekStartsOn: 1 });
    end = endOfWeek(selected, { weekStartsOn: 1 });
  }
  const days = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  const appointments = (day: string) =>
    rows.filter((r) => localInput(String(r.starts_at)).slice(0, 10) === day);
  if (view === "dia")
    return (
      <div className="schedule">
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} style={{ display: "contents" }}>
            <time>{String(h).padStart(2, "0")}:00</time>
            <div>
              {appointments(format(selected, "yyyy-MM-dd"))
                .filter(
                  (r) =>
                    Number(localInput(String(r.starts_at)).slice(11, 13)) === h,
                )
                .map((r) => (
                  <a
                    className="event"
                    key={String(r.id)}
                    href={`/sistema/agenda?edit=${r.id}&date=${date}&view=dia`}
                  >
                    {prettyDate(String(r.starts_at))} –{" "}
                    {localInput(String(r.ends_at)).slice(11)}
                    <br />
                    {String(r.patient_name ?? r.title)} ·{" "}
                    {String(r.branch_id ?? "Por vincular")} · {String(r.status)}
                  </a>
                ))}
            </div>
          </div>
        ))}
      </div>
    );
  return (
    <div className="table-wrap">
      <div className="calendar">
        {days.map((d) => {
          const day = format(d, "yyyy-MM-dd");
          return (
            <div className="day" key={day}>
              <b>{format(d, "dd/MM")}</b>
              {appointments(day).map((r) => (
                <a
                  className="event"
                  key={String(r.id)}
                  href={`/sistema/agenda?edit=${r.id}&date=${date}&view=${view}`}
                >
                  {localInput(String(r.starts_at)).slice(11)} ·{" "}
                  {String(r.patient_name ?? r.title)}
                  <br />
                  {String(r.branch_id ?? "Por vincular")} · {String(r.status)}
                </a>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
export function calendarRange(view: string, date: string) {
  const d = new Date(date + "T12:00:00");
  if (Number.isNaN(d.getTime())) throw new Error("Fecha inválida");
  let start = d,
    end = d;
  if (view === "mes") {
    start = startOfWeek(startOfMonth(d), { weekStartsOn: 1 });
    end = endOfWeek(endOfMonth(d), { weekStartsOn: 1 });
  } else if (view === "semana") {
    start = startOfWeek(d, { weekStartsOn: 1 });
    end = endOfWeek(d, { weekStartsOn: 1 });
  }
  return {
    start: localToISO(format(start, "yyyy-MM-dd") + "T00:00"),
    end: localToISO(format(addDays(end, 1), "yyyy-MM-dd") + "T00:00"),
  };
}
