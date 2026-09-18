import { useState } from "react";
import { eventLabel, eventColor } from "../domain/plan";

const HOUR_W = 44;
const ROW_H = 26;
const GRID_W = 24 * HOUR_W;
const COL_W = 46;
const COL_GAP = 10;
const HOUR_H = 18;
const GRID_H = 24 * HOUR_H;
const ROWS = [
  { key: "off_duty", label: "1 Off Duty", short: "Off" },
  { key: "sleeper", label: "2 Sleeper Berth", short: "SB" },
  { key: "driving", label: "3 Driving", short: "Drive" },
  { key: "on_duty", label: "4 On Duty (Not Driving)", short: "On" },
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

  // mobile vertical grid geometry
  const mobileGridTotalW = ROWS.length * COL_W + (ROWS.length - 1) * COL_GAP;
  const leftAxisW = 58; // room for "12 AM" / "10 PM" style labels
  const rightTotalsW = 46; // room for totals column at far right
  const mobileViewW = leftAxisW + mobileGridTotalW + rightTotalsW;
  const topLabelH = 26;
  const mobileViewH = topLabelH + GRID_H + 30;

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
      <div className="grid-frame">
        {/* Desktop: horizontal 24h grid */}
        <svg
          className="eld-svg"
          viewBox={`-150 -22 ${GRID_W + 150 + 70} ${4 * ROW_H + 70}`}
          role="img"
          aria-label={`ELD grid for ${day.date}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* hour ticks + labels */}
          {Array.from({ length: 25 }, (_, h) => {
            const x = h * HOUR_W;
            const label = h === 0 ? "Midnight" : h === 12 ? "Noon" : h === 24 ? "24" : h;
            return (
              <g key={h}>
                <line x1={x} y1={-8} x2={x} y2={0} stroke="currentColor" strokeWidth="1.4" />
                <text x={x} y={-11} textAnchor="middle" fontSize="13" fill="currentColor" fontWeight="600">
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
                  strokeWidth="0.7"
                  opacity="0.6"
                />
              ) : null
            )
          )}

          {/* rows */}
          {ROWS.map((row) => {
            const y = ROWS.indexOf(row) * ROW_H;
            return (
              <g key={row.key} transform={`translate(0 ${y})`}>
                <line x1={0} y1={0} x2={GRID_W} y2={0} stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
                {Array.from({ length: 25 }, (_, h) => (
                  <line key={h} x1={h * HOUR_W} y1={0} x2={h * HOUR_W} y2={ROW_H} stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
                ))}
                <text x={-10} y={ROW_H / 2 + 4} textAnchor="end" fontSize="12.5" fill="currentColor" fontWeight="500">
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
                    strokeWidth="3"
                    strokeLinecap="butt"
                  />
                ))}
                {/* vertical connectors into the row at status-change times */}
                {verticalConnectors(day, row.key).map((v, i) => (
                  <line key={`v${i}`} x1={v.x} y1={ROW_H / 2 - 10} x2={v.x} y2={ROW_H / 2 + 10} stroke="currentColor" strokeWidth="1.3" />
                ))}
                <text x={GRID_W + 10} y={ROW_H / 2 + 4} fontSize="13" fill="currentColor" fontWeight="600">
                  {totals[row.key]}
                </text>
              </g>
            );
          })}
          <line x1={0} y1={4 * ROW_H} x2={GRID_W} y2={4 * ROW_H} stroke="currentColor" strokeWidth="1.2" />
          <text x={GRID_W + 10} y={4 * ROW_H + 16} fontSize="13" fill="currentColor" fontWeight="bold">
            {totals.total}
          </text>
          <text x={0} y={4 * ROW_H + 16} fontSize="11" fill="currentColor" opacity="0.7">
            TOTAL HOURS (must equal 24)
          </text>
        </svg>

        {/* Mobile: vertical rotated grid — hours flow top-to-bottom, columns clearly separated */}
        <svg
          className="eld-svg-mobile"
          viewBox={`0 0 ${mobileViewW} ${mobileViewH}`}
          role="img"
          aria-label={`ELD grid (vertical) for ${day.date}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <g transform={`translate(${leftAxisW} ${topLabelH})`}>
            {/* hour ticks + labels on the left */}
            {Array.from({ length: 25 }, (_, h) => {
              const y = h * HOUR_H;
              const label =
                h === 0 ? "12 AM" : h === 12 ? "Noon" : h === 24 ? "12 AM" : h > 12 ? `${h - 12} PM` : `${h} AM`;
              return (
                <g key={h}>
                  <line x1={-6} y1={y} x2={0} y2={y} stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
                  <text x={-10} y={y + 3.5} textAnchor="end" fontSize="10.5" fill="currentColor" fontWeight="500">
                    {label}
                  </text>
                </g>
              );
            })}

            {/* outer frame around all four columns */}
            <rect
              x={-1}
              y={0}
              width={mobileGridTotalW + 2}
              height={GRID_H}
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              opacity="0.5"
            />

            {/* columns */}
            {ROWS.map((row, idx) => {
              const x = idx * (COL_W + COL_GAP);
              return (
                <g key={row.key} transform={`translate(${x} 0)`}>
                  {/* column header */}
                  <text x={COL_W / 2} y={-10} textAnchor="middle" fontSize="12" fill="currentColor" fontWeight="700">
                    {row.short}
                  </text>

                  {/* column border */}
                  <rect
                    x={0}
                    y={0}
                    width={COL_W}
                    height={GRID_H}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.8"
                    opacity="0.35"
                  />

                  {/* hour gridlines within the column */}
                  {Array.from({ length: 25 }, (_, h) => (
                    <line
                      key={h}
                      x1={0}
                      y1={h * HOUR_H}
                      x2={COL_W}
                      y2={h * HOUR_H}
                      stroke="currentColor"
                      strokeWidth={h % 6 === 0 ? 0.9 : 0.6}
                      opacity={h % 6 === 0 ? 0.35 : 0.18}
                    />
                  ))}

                  {/* duty bar */}
                  {segmentsFor(day, row.key).map((s, i) => (
                    <rect
                      key={i}
                      x={COL_W / 2 - 4}
                      y={(s.start / 60) * HOUR_H}
                      width={8}
                      height={Math.max(2, ((s.end - s.start) / 60) * HOUR_H)}
                      rx={4}
                      fill="currentColor"
                      opacity="0.95"
                    />
                  ))}

                  {/* tick marks at status-change times */}
                  {verticalConnectors(day, row.key).map((v, i) => (
                    <line
                      key={`v${i}`}
                      x1={COL_W / 2 - 9}
                      y1={(v.x / 60) * HOUR_H}
                      x2={COL_W / 2 + 9}
                      y2={(v.x / 60) * HOUR_H}
                      stroke="currentColor"
                      strokeWidth="1.1"
                      opacity="0.8"
                    />
                  ))}

                  {/* per-column total, placed right under the column, not mid-grid */}
                  <text
                    x={COL_W / 2}
                    y={GRID_H + 18}
                    textAnchor="middle"
                    fontSize="12"
                    fill="currentColor"
                    fontWeight="700"
                  >
                    {totals[row.key]}
                  </text>
                </g>
              );
            })}

            {/* grand total, to the right of all columns */}
            <text
              x={mobileGridTotalW + 14}
              y={GRID_H / 2}
              fontSize="12.5"
              fill="currentColor"
              fontWeight="800"
              textAnchor="start"
            >
              {totals.total}
            </text>
            <text
              x={mobileGridTotalW + 14}
              y={GRID_H / 2 + 16}
              fontSize="9"
              fill="currentColor"
              opacity="0.7"
              textAnchor="start"
            >
              TOTAL
            </text>
          </g>
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