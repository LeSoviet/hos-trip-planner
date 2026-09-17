import { fetchPlan, fetchRecentPlans } from "../infrastructure/apiClient";

export function usePlanService(baseUrl) {
  return {
    getPlan: (inputs) => fetchPlan(inputs, { baseUrl }),
    getRecentPlans: () => fetchRecentPlans({ baseUrl }),
  };
}