export default function RecentPlans({ plans, onReopen }) {
  return (
    <div className="recent-plans">
      <h3>Recent plans</h3>
      <ul>
        {plans.map((row) => (
          <li key={row.id}>
            <button type="button" onClick={() => onReopen(row)}>
              <span className="recent-route">
                {row.inputs.pickup_location} → {row.inputs.dropoff_location}
              </span>
              <span className="recent-date">
                {new Date(row.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}