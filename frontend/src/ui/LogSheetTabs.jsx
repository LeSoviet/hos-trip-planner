import { useState } from "react";
import { eventColor, eventLabel } from "../domain/plan";

const ROWS = [
  { key: "off_duty", label: "1 Off duty" },
  { key: "sleeper", label: "2 Sleeper berth" },
  { key: "driving", label: "3 Driving" },
  { key: "on_duty", label: "4 On duty (not driving)" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function minutesOfDay(iso) {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

export default function LogSheetTabs({ days }) {
  const [active, setActive] = useState(0);
  const day = days[Math.min(active, days.length - 1)];

  return (
    <div className="log-sheets">
      <div className="sheet-tabs" role="tablist">
        {days.map((d, i) => (
          <button
            key={d.date}
            role="tab"
            aria-selected={i === active}
            className={`sheet-tab ${i === active ? "active" : ""}`}
            onClick={() => setActive(i)}
          >
            {new Date(d.date + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </button>
        ))}
      </div>
      <LogGrid day={day} dayIndex={active} total={days.length} />
    </div>
  );
}

function LogGrid({ day, dayIndex, total }) {
  return (
    <div className="log-sheet">
      <div className="sheet-header">
        <div>
          <strong>Driver's Daily Log</strong> — Day {dayIndex + 1} of {total}
        </div>
        <div>
          <strong>Date:</strong>{" "}
          {new Date(day.date + "T12:00:00").toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>
      <div className="grid-scroll">
        <table className="eld-grid">
          <thead>
            <tr>
              <th className="row-head"></th>
              {HOURS.map((h) => (
                <th key={h}>{h === 0 ? "Midnight" : h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.key}>
                <td className="row-head">{row.label}</td>
                {HOURS.map((h) => {
                  const segments = day.events.filter(
                    (e) => e.type === row.key && minutesOfDay(e.start) < (h + 1) * 60 && minutesOfDay(e.end) > h * 60
                  );
                  const full = segments.some(
                    (e) => minutesOfDay(e.start) <= h * 60 && minutesOfDay(e.end) >= (h + 1) * 60
                  );
                  const partial = segments.length > 0 && !full;
                  const seg = segments[0];
                  return (
                    <td
                      key={h}
                      className={
                        full
                          ? "cell filled"
                          : partial
                            ? "cell partial"
                            : "cell"
                      }
                      style={seg ? { background: eventColor(seg.type) } : undefined}
                      title={
                        seg
                          ? `${eventLabel(seg.type)} ${seg.start.slice(11, 16)}–${seg.end.slice(11, 16)}${seg.label ? ` (${seg.label})` : ""}`
                        : undefined
                      }
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="sheet-legend">
        {day.events.map((e, i) => (
          <span key={i} className="legend-item">
            <span className="dot" style={{ background: eventColor(e.type) }} />
            {eventLabel(e.type)} {e.start.slice(11, 16)}–{e.end.slice(11, 16)}
            {e.label ? ` · ${e.label}` : ""}
          </span>
        ))}
      </div>
    </div>
  );
}