import { useCallback, useEffect, useMemo, useState } from "react";
import { Filter } from "lucide-react";

import AppShell from "../components/layout/AppShell";
import api from "../services/api";
import socket from "../services/socket";

const filters = ["all", "project", "task", "team", "auth"];

export default function Activity() {
  const [activities, setActivities] = useState([]);
  const [filter, setFilter] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(true);

  const fetchActivities = useCallback(async () => {
    const res = await api.get(`/activities?type=${filter}`);
    setActivities(res.data);
  }, [filter]);

  useEffect(() => {
    const timer = setTimeout(fetchActivities, 0);
    socket.on("activityUpdated", fetchActivities);
    socket.on("refreshTasks", fetchActivities);
    socket.on("projectUpdated", fetchActivities);

    return () => {
      clearTimeout(timer);
      socket.off("activityUpdated", fetchActivities);
      socket.off("refreshTasks", fetchActivities);
      socket.off("projectUpdated", fetchActivities);
    };
  }, [fetchActivities]);

  const grouped = useMemo(() => {
    return activities.reduce((acc, activity) => {
      const day = new Date(activity.createdAt).toLocaleDateString();
      acc[day] = acc[day] || [];
      acc[day].push(activity);
      return acc;
    }, {});
  }, [activities]);

  return (
    <AppShell title="Activity" subtitle="A professional grouped timeline for every meaningful change.">
      <main className="page-content">
        <section className="dashboard-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Jira-style timeline</p>
              <h3>Recent Activity</h3>
            </div>
            <button
              className={`icon-button ${filtersOpen ? "active" : ""}`}
              type="button"
              onClick={() => setFiltersOpen((value) => !value)}
              aria-label="Toggle filters"
            >
              <Filter size={20} />
            </button>
          </div>

          {filtersOpen && (
            <div className="kanban-toolbar left">
              {filters.map((item) => (
                <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>
                  {item}
                </button>
              ))}
            </div>
          )}

          <div className="grouped-timeline">
            {Object.entries(grouped).map(([day, items]) => (
              <section key={day}>
                <h4>{day}</h4>
                {items.map((activity) => (
                  <article key={activity._id} className="timeline-card">
                    <div className="avatar">
                      {activity.actor?.avatar ? <img src={activity.actor.avatar} alt="" /> : activity.actor?.name?.slice(0, 1) || "A"}
                    </div>
                    <div>
                      <p>{activity.message}</p>
                      <span>{activity.actor?.name || "System"} - {activity.type}</span>
                    </div>
                    <time>{new Date(activity.createdAt).toLocaleTimeString()}</time>
                  </article>
                ))}
              </section>
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
