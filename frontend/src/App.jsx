import { useEffect, useState } from "react";
import TripForm from "./ui/TripForm";
import MapView from "./ui/MapView";
import PlanSummary from "./ui/PlanSummary";
import LogSheetTabs from "./ui/LogSheetTabs";
import RouteTimeline from "./ui/RouteTimeline";
import RecentPlans from "./ui/RecentPlans";
import { createPlanService } from "./application/planService";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

const service = createPlanService(API_BASE);

export default function App() {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    service.getRecentPlans().then(setRecent).catch(() => {});
  }, []);

  const submit = async (inputs) => {
    setLoading(true);
    setError(null);
    try {
      const result = await service.getPlan(inputs);
      setPlan(result);
      service.getRecentPlans().then(setRecent).catch(() => {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reopen = async (row) => {
    setPlan(row.plan);
    setError(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>HOS Trip Planner</h1>
          <p className="subtitle">
            FMCSA property-carrying 70h/8d · 11h driving · 14h window · 30min break
          </p>
        </div>
      </header>
      <main className="app-main">
        <aside className="app-sidebar">
          <TripForm onSubmit={submit} loading={loading} error={error} />
          {recent.length > 0 && <RecentPlans plans={recent} onReopen={reopen} />}
        </aside>
        <section className="app-content">
          {plan ? (
            <>
              <PlanSummary plan={plan} />
              <div className="content-split">
                <div className="map-panel">
                  <MapView plan={plan} />
                </div>
                <RouteTimeline days={plan.days} />
              </div>
              <LogSheetTabs days={plan.days} />
            </>
          ) : (
            <div className="empty-state">
              <h2>Plan a trip</h2>
              <p>
                Enter current location, pickup, dropoff and hours used in the current
                70h/8day cycle. The planner applies FMCSA HOS rules and draws your ELD
                log sheets.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}