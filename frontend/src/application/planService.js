import { fetchPlan, fetchRecentPlans, fetchPlanById } from "../infrastructure/apiClient";

export function createPlanService(baseUrl) {
  return {
    getPlan: (inputs) => fetchPlan(inputs, { baseUrl }),
    getRecentPlans: () => fetchRecentPlans({ baseUrl }),
    getPlanById: (planId) => fetchPlanById(planId, { baseUrl }),
  };
}