import { useState } from "react";
import { eventLabel, eventColor } from "../domain/plan";

const HOUR_W = 44;
const ROW_H = 26;
const GRID_W = 24 * HOUR_W;
const ROWS = [
  { key: "off_duty", label: "1 Off Duty" },
  { key: "sleeper", label: "2 Sleeper Berth" },
  { key: "driving", label: "3 Driving" },
  { key: "on_duty", label: "4 On Duty (Not Driving)" },
];

function minutesOfDay(iso) {
  const time = iso.slice(11, 16);
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function segmentsFor(day, type) {
  return day.events
    .filter((e) => e.type === type)
    .map((e) => ({
      start: minutesOfDay(e.start),
      end: e.end.slice(11, 16) === "00:00" && e.end > e.start ? 1440 : minutesOfDay(e.end),
      event: e,
    }))
    .filter((s) => s.end > s.start)
    .sort((a, b) => a.start - b.start);
}

function verticalConnectors(day, type) {
  const segs = segmentsFor(day, type);
  return segs.map((s) => ({ x: (s.start / 60) * HOUR_W }));
}

function remarksFor(day, inputs) {
  const items = day.events
    .filter((e) => e.location || (e.type === "on_duty" && e.label) || e.type === "fuel")
    .map((e) => {
      const time = e.start.slice(11, 16);
      if (e.location) return `${time} ${e.location}`;
      if (e.type === "fuel") return `${time} Fuel stop`;
      return `${time} ${e.label}`;
    });
  if (!items.length && inputs) {
    return [`${day.date.slice(5)} departed ${inputs.current_location} toward ${inputs.pickup_location}`];
  }
  return items;
}

function totalsFor(day) {
  const totals = { off_duty: 0, sleeper: 0, driving: 0, on_duty: 0 };
  day.events.forEach((e) => {
    const minutes =
      (new Date(e.end).getTime() - new Date(e.start).getTime()) / 60000;
    totals[e.type] = (totals[e.type] || 0) + minutes;
  });
  const fmt = (m) => `${Math.floor(m / 60)}:${String(Math.round(m % 60)).padStart(2, "0")}`;
  return {
    off_duty: fmt(totals.off_duty || 0),
    sleeper: fmt(totals.sleeper || 0),
    driving: fmt(totals.driving || 0),
    on_duty: fmt(totals.on_duty || 0),
    total: fmt(24 * 60),
  };
}

export default function LogSheetTabs({ days, inputs }) {
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
      <LogSheet day={day} dayIndex={active} total={days.length} inputs={inputs} />
    </div>
  );
}

function LogSheet({ day, dayIndex, total, inputs }) {
  const totals = totalsFor(day);
  const remarks = remarksFor(day, inputs);
  const date = new Date(day.date + "T12:00:00");

  return (
    <div className="log-sheet">
      <div className="rods-head">
        <div className="rods-title">
          U.S. DEPARTMENT OF TRANSPORTATION
          <strong>DRIVER'S DAILY LOG</strong>
          <span>(ONE CALENDAR DAY — 24 HOURS)</span>
        </div>
        <div className="rods-meta">
          <div className="rods-field">
            <label>Date</label>
            {date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}
          </div>
          <div className="rods-field">
            <label>Total miles driving today</label>
            {Math.round(day.total_miles || 0).toLocaleString("en-US")}
          </div>
          <div className="rods-field">
            <label>Day</label>
            {dayIndex + 1} of {total}
          </div>
        </div>
      </div>
      <div className="grid-scroll">
        <svg
          className="eld-svg"
          viewBox={`-150 -22 ${GRID_W + 150 + 70} ${4 * ROW_H + 70}`}
          role="img"
          aria-label={`ELD grid for ${day.date}`}
        >
          {/* hour ticks + labels */}
          {Array.from({ length: 25 }, (_, h) => {
            const x = h * HOUR_W;
            const label = h === 0 ? "Midnight" : h === 12 ? "Noon" : h === 24 ? "24" : h;
            return (
              <g key={h}>
                <line x1={x} y1={-8} x2={x} y2={0} stroke="currentColor" strokeWidth="1" />
                <text x={x} y={-11} textAnchor="middle" fontSize="9" fill="currentColor">
                  {label}
                </text>
              </g>
            );
          })}
          {Array.from({ length: 24 }, (_, h) =>
            Array.from({ length: 4 }, (_, q) =>
              q > 0 ? (
                <line
                  key={`${h}-${q}`}
                  x1={h * HOUR_W + (q * HOUR_W) / 4}
                  y1={-8}
                  x2={h * HOUR_W + (q * HOUR_W) / 4}
                  y2={-4}
                  stroke="currentColor"
                  strokeWidth="0.5"
                  opacity="0.6"
                />
              ) : null
            )
          )}

          {/* rows */}
          {ROWS.map((row, r) => {
            const y = r * ROW_H;
            return (
              <g key={row.key} transform={`translate(0 ${y})`}>
                <line x1={0} y1={0} x2={GRID_W} y2={0} stroke="currentColor" strokeWidth="0.6" opacity="0.35" />
                {Array.from({ length: 25 }, (_, h) => (
                  <line key={h} x1={h * HOUR_W} y1={0} x2={h * HOUR_W} y2={ROW_H} stroke="currentColor" strokeWidth="0.6" opacity="0.35" />
                ))}
                <text x={-8} y={ROW_H / 2 + 3} textAnchor="end" fontSize="10" fill="currentColor">
                  {row.label}
                </text>
                {segmentsFor(day, row.key).map((s, i) => (
                  <line
                    key={i}
                    x1={(s.start / 60) * HOUR_W}
                    y1={ROW_H / 2}
                    x2={(s.end / 60) * HOUR_W}
                    y2={ROW_H / 2}
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="butt"
                  />
                ))}
                {/* vertical connectors into the row at status-change times */}
                {verticalConnectors(day, row.key).map((v, i) => (
                  <line key={`v${i}`} x1={v.x} y1={ROW_H / 2 - 9} x2={v.x} y2={ROW_H / 2 + 9} stroke="currentColor" strokeWidth="1" />
                ))}
                <text x={GRID_W + 8} y={ROW_H / 2 + 3} fontSize="10" fill="currentColor">
                  {totals[row.key]}
                </text>
              </g>
            );
          })}
          <line x1={0} y1={4 * ROW_H} x2={GRID_W} y2={4 * ROW_H} stroke="currentColor" strokeWidth="1" />
          <text x={-8} y={4 * ROW_H - ROW_H + 3} textAnchor="end" fontSize="10" fill="currentColor" opacity="0">
            .
          </text>
          <text x={GRID_W + 8} y={4 * ROW_H + 12} fontSize="10" fill="currentColor" fontWeight="bold">
            {totals.total}
          </text>
          <text x={0} y={4 * ROW_H + 12} fontSize="9" fill="currentColor" opacity="0.7">
            TOTAL HOURS (must equal 24)
          </text>
        </svg>
      </div>
      <div className="rods-remarks">
        <label>Remarks (city, state at each duty status change)</label>
        <div className="remarks-lines">
          {remarks.length ? (
            remarks.map((r, i) => <span key={i} className="remark-item">{r}</span>)
          ) : (
            <span className="remark-item muted">—</span>
          )}
        </div>
      </div>
      <div className="sheet-legend">
        {day.events.map((e, i) => (
          <span key={i} className="legend-item">
            <span className="dot" style={{ background: eventColor(e.type) }} />
            {eventLabel(e.type)} {e.start.slice(11, 16)}–{e.end.slice(11, 16)}
            {e.location ? ` · ${e.location}` : e.label ? ` · ${e.label}` : ""}
          </span>
        ))}
      </div>
    </div>
  );
}