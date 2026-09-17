export default function PlanSummary({ plan }) {
  const { route, stops, cycle_used_after_hours } = plan;
  return (
    <div className="plan-summary">
      <div className="summary-card">
        <span className="summary-value">{Math.round(route.miles).toLocaleString("en-US")}</span>
        <span className="summary-label">total miles</span>
      </div>
      <div className="summary-card">
        <span className="summary-value">{route.drive_hours.toFixed(1)}</span>
        <span className="summary-label">drive hours</span>
      </div>
      <div className="summary-card">
        <span className="summary-value">{plan.days.length}</span>
        <span className="summary-label">days</span>
      </div>
      <div className="summary-card">
        <span className="summary-value">{cycle_used_after_hours.toFixed(1)}</span>
        <span className="summary-label">cycle used after</span>
      </div>
    </div>
  );
}