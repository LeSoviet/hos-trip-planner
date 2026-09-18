export async function fetchPlan(inputs, { baseUrl }) {
  const response = await fetch(`${baseUrl}/api/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(inputs),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || `Plan request failed (${response.status})`);
  }
  return response.json();
}

export async function fetchRecentPlans({ baseUrl }) {
  const response = await fetch(`${baseUrl}/api/plans`);
  if (!response.ok) return [];
  return response.json();
}

export async function fetchPlanById(planId, { baseUrl }) {
  const response = await fetch(`${baseUrl}/api/plans/${planId}`);
  if (!response.ok) return null;
  return response.json();
}