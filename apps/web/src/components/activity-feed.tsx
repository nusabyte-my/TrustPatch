import type { RunEvent } from "@trustpatch/contracts";

const roleLabels: Record<string, string> = {
  mend: "Mend", inspector: "Inspector", mapper: "Mapper", repair: "Repair", verifier: "Verifier"
};
const statusLabels: Record<string, string> = {
  active: "Working", info: "Observed", success: "Passed", warning: "Attention"
};

export function ActivityFeed({ events }: { events: RunEvent[] }) {
  const activities = events.filter((event) => event.type === "activity");
  const latest = activities.at(-1);
  const vulnerabilityCount = activities.filter((event) => event.data.activity === "vulnerability").length;
  return <section className="activity" aria-labelledby="activity-title">
    <div className="section-heading"><div><h3 id="activity-title">Mend activity</h3><span className="activity-subtitle">Live inspection and repair updates</span></div><span>{vulnerabilityCount} vulnerability alerts</span></div>
    {latest && <p className="sr-only" role="status" aria-live="polite">{roleLabels[latest.role]}: {latest.message}</p>}
    {activities.length === 0 ? <p className="muted">Waiting for the worker to begin inspection…</p> : <ol className="activity-list">{activities.map((event) => {
      const state = typeof event.data.status === "string" ? event.data.status : "info";
      const kind = typeof event.data.activity === "string" ? event.data.activity : "inspection";
      return <li className={`activity-item activity-${state}`} key={event.id}>
        <span className="activity-marker" aria-hidden="true" />
        <div className="activity-content">
          <div className="activity-meta"><span className="activity-role">{roleLabels[event.role]}</span><span className={`activity-badge activity-badge-${state}`}>{statusLabels[state] ?? state}</span><span className="activity-kind">{kind}</span><time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time></div>
          <p>{event.message}</p>
        </div>
      </li>;
    })}</ol>}
  </section>;
}
