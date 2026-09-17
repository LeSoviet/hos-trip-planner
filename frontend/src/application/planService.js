import { fetchPlan, fetchRecentPlans } from "../infrastructure/apiClient";

export function createPlanService(baseUrl) {
  return {
    getPlan: (inputs) => fetchPlan(inputs, { baseUrl }),
    getRecentPlans: () => fetchRecentPlans({ baseUrl }),
  };
}