import { eventColor, eventTitle, eventDetail, eventTimeLabel } from "../domain/plan";

export default function RouteTimeline({ days }) {
  const events = days.flatMap((day) =>
    day.events.map((event) => ({ ...event, day: day.date }))
  );

  return (
    <div className="route-timeline">
      <h3 className="timeline-kicker">Route instructions</h3>
      <h2 className="timeline-heading">Stops, rests, and duty changes</h2>
      <ol className="timeline-list">
        {events.map((event, i) => {
          const color = eventColor(event.type);
          const last = i === events.length - 1;
          return (
            <li key={i} className={`timeline-item ${last ? "last" : ""}`}>
              <span className="timeline-dot" style={{ background: color }} />
              {!last && <span className="timeline-line" />}
              <div className="timeline-body">
                <div className="timeline-row">
                  <strong>{eventTitle(event)}</strong>
                  <span className="timeline-time">{eventTimeLabel(event.start)}</span>
                </div>
                <span className="timeline-detail">{eventDetail(event)}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}