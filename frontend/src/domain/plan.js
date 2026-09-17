const EVENT_COLORS = {
  driving: "#f59e0b",
  on_duty: "#3b82f6",
  off_duty: "#6b7280",
  sleeper: "#8b5cf6",
  fuel: "#22c55e",
};

export const eventColor = (type) => EVENT_COLORS[type] || "#6b7280";

export const EVENT_LABELS = {
  driving: "Driving",
  on_duty: "On duty (not driving)",
  off_duty: "Off duty",
  sleeper: "Sleeper berth",
  fuel: "Fueling",
};

export const eventLabel = (type) => EVENT_LABELS[type] || type;

const MARKERS = {
  pickup: { color: "#22c55e", label: "Pickup" },
  dropoff: { color: "#ef4444", label: "Dropoff" },
  current: { color: "#3b82f6", label: "Current" },
  fuel: { color: "#22c55e", label: "Fuel" },
  break: { color: "#8b5cf6", label: "30min break" },
  reset: { color: "#8b5cf6", label: "10h rest" },
  restart: { color: "#8b5cf6", label: "34h restart" },
};

export const markerFor = (event) => {
  if (event.type === "on_duty" && event.label) {
    const key = event.label.toLowerCase().includes("dropoff") ? "dropoff" : "pickup";
    return MARKERS[key];
  }
  if (event.type === "fuel") return MARKERS.fuel;
  if (event.type === "sleeper") return MARKERS.reset;
  if (event.type === "off_duty") {
    const hours = (new Date(event.end) - new Date(event.start)) / 3600000;
    if (hours >= 34) return MARKERS.restart;
    if (hours >= 10) return MARKERS.reset;
    return null;
  }
  return null;
};

export function interpoleAlongRoute(coordinates, mileAt, totalMiles) {
  if (!coordinates.length) return null;
  if (mileAt <= 0) return coordinates[0];
  if (mileAt >= totalMiles) return coordinates[coordinates.length - 1];
  const segMiles = [];
  let acc = 0;
  for (let i = 1; i < coordinates.length; i++) {
    const d = haversineMiles(coordinates[i - 1], coordinates[i]);
    segMiles.push(d);
    acc += d;
  }
  if (acc === 0) return coordinates[0];
  let target = (mileAt / totalMiles) * acc;
  for (let i = 0; i < segMiles.length; i++) {
    if (target <= segMiles[i]) {
      const t = segMiles[i] === 0 ? 0 : target / segMiles[i];
      const [lon0, lat0] = coordinates[i];
      const [lon1, lat1] = coordinates[i + 1];
      return [lon0 + (lon1 - lon0) * t, lat0 + (lat1 - lat0) * t];
    }
    target -= segMiles[i];
  }
  return coordinates[coordinates.length - 1];
}

export function haversineMiles([lon1, lat1], [lon2, lat2]) {
  const R = 3958.8;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.sin(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function formatHours(hours) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}