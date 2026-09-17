import { useState } from "react";

const EMPTY = {
  current_location: "",
  pickup_location: "",
  dropoff_location: "",
  current_cycle_used_hours: "",
};

export default function TripForm({ onSubmit, loading, error }) {
  const [values, setValues] = useState(EMPTY);

  const set = (field) => (e) =>
    setValues((v) => ({ ...v, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...values, current_cycle_used_hours: Number(values.current_cycle_used_hours || 0) });
  };

  return (
    <form className="trip-form" onSubmit={handleSubmit}>
      <label>
        Current location
        <input
          value={values.current_location}
          onChange={set("current_location")}
          placeholder="e.g. Houston, TX"
          required
        />
      </label>
      <label>
        Pickup location
        <input
          value={values.pickup_location}
          onChange={set("pickup_location")}
          placeholder="e.g. Dallas, TX"
          required
        />
      </label>
      <label>
        Dropoff location
        <input
          value={values.dropoff_location}
          onChange={set("dropoff_location")}
          placeholder="e.g. Atlanta, GA"
          required
        />
      </label>
      <label>
        Current cycle used (hrs)
        <input
          type="number"
          min="0"
          max="70"
          step="0.25"
          value={values.current_cycle_used_hours}
          onChange={set("current_cycle_used_hours")}
          placeholder="0 – 70"
          required
        />
      </label>
      <button type="submit" disabled={loading}>
        {loading ? "Planning…" : "Calculate trip plan"}
      </button>
      {error && <p className="form-error">{error}</p>}
    </form>
  );
}