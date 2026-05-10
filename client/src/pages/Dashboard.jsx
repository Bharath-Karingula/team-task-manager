import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { CalendarClock, CheckCircle2, FolderKanban, Timer, TrendingUp } from "lucide-react";

import AppShell from "../components/layout/AppShell";
import api from "../services/api";
import socket from "../services/socket";
import { getCurrentUser } from "../services/auth";

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Dashboard() {
  const scope = useRef(null);
  const user = getCurrentUser();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [lastUpdated, setLastUpdated] = useState("");

  const fetchData = async () => {
    try {
      const [projectRes, taskRes, activityRes] = await Promise.all([
        api.get("/projects"),
        api.get("/tasks?excludeDemo=true"),
        api.get("/activities")
      ]);

      // Deduplicate projects
      const seen = new Set();
      const uniqueProjects = projectRes.data.filter((p) => {
        if (seen.has(p._id)) return false;
        seen.add(p._id);
        return true;
      });
      setProjects(uniqueProjects);
      setTasks(taskRes.data);
      setActivities(activityRes.data.slice(0, 6));
      setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } catch {
      setProjects([]);
      setTasks([]);
      setActivities([]);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchData, 0);
    socket.on("refreshTasks", fetchData);
    socket.on("projectUpdated", fetchData);
    socket.on("activityUpdated", fetchData);

    return () => {
      clearTimeout(timer);
      socket.off("refreshTasks", fetchData);
      socket.off("projectUpdated", fetchData);
      socket.off("activityUpdated", fetchData);
    };
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".metric-card", {
        y: 18,
        opacity: 0,
        duration: 0.55,
        stagger: 0.08,
        ease: "power3.out"
      });
      gsap.from(".dashboard-panel", {
        y: 16,
        opacity: 0,
        duration: 0.65,
        stagger: 0.08,
        delay: 0.15,
        ease: "power3.out"
      });
    }, scope);

    return () => ctx.revert();
  }, [projects.length, tasks.length]);

  const stats = useMemo(() => {
    const completed = tasks.filter((task) => task.status === "Completed").length;
    const now = new Date();
    const todayTasks = tasks.filter((task) => {
      const date = task.dueDate || task.updatedAt || task.createdAt;
      if (!date) return false;
      return new Date(date).toDateString() === now.toDateString();
    }).length;

    return [
      { label: "Projects", value: projects.length, icon: FolderKanban, tone: "blue" },
      { label: "Tasks", value: tasks.length, icon: CheckCircle2, tone: "green" },
      { label: "Today", value: todayTasks, icon: CalendarClock, tone: "amber" },
      {
        label: "Completion",
        value: tasks.length ? `${Math.round((completed / tasks.length) * 100)}%` : "0%",
        icon: TrendingUp,
        tone: "violet"
      }
    ];
  }, [projects, tasks]);

  const todayWork = useMemo(() => {
    const now = new Date();
    return tasks.filter((task) => {
      const date = task.dueDate || task.updatedAt || task.createdAt;
      return date && new Date(date).toDateString() === now.toDateString();
    });
  }, [tasks]);

  const firstName = user?.name?.trim()?.split(" ")[0] || "there";

  const chartData = useMemo(() => {
    const baseline = weekDays.map((name) => ({ name, tasks: 0, focus: 0 }));

    tasks.forEach((task) => {
      const date = task.dueDate || task.updatedAt || task.createdAt ? new Date(task.dueDate || task.updatedAt || task.createdAt) : new Date(0);
      const dayIndex = date.getDay();
      baseline[dayIndex].tasks += 1;
      baseline[dayIndex].focus += Number(task.trackedTime || 0);
    });

    return baseline;
  }, [tasks]);

  return (
    <AppShell
      title="Dashboard"
      subtitle={`Live workspace for ${firstName}. Updated ${lastUpdated || "now"}.`}
    >
      <main ref={scope} className="page-content">
        <section className="hero-dashboard">
          <div>
            <p className="eyebrow">Project Management System</p>
            <h2>{firstName}'s real-time work dashboard.</h2>
            <p>
              Today&apos;s assigned tasks, project progress, activity, and tracked work update
              automatically as the team moves.
            </p>
            <span className="live-status">
              <span />
              Real-time sync active
            </span>
          </div>
          <div className="hero-stat">
            <Timer size={22} />
            <strong>{tasks.reduce((sum, task) => sum + (task.trackedTime || 0), 0)}h</strong>
            <span>Tracked time</span>
          </div>
        </section>

        <section className="metrics-grid">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <article key={stat.label} className={`metric-card ${stat.tone}`}>
                <Icon size={22} />
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </article>
            );
          })}
        </section>

        <section className="dashboard-grid">
          <article className="dashboard-panel chart-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Velocity</p>
                <h3>Weekly Productivity</h3>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="tasks" fill="var(--accent)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </article>

          <article className="dashboard-panel chart-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Focus</p>
                <h3>Deep Work Trend</h3>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="focusGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--success)" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="focus" stroke="var(--success)" fill="url(#focusGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </article>
        </section>

        <section className="dashboard-grid slim">
          <article className="dashboard-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Today</p>
                <h3>Assigned Work</h3>
              </div>
            </div>
            <div className="timeline-list">
              {todayWork.length === 0 && <p className="muted">No assigned work due today.</p>}
              {todayWork.slice(0, 5).map((task) => (
                <div key={task._id} className="timeline-item">
                  <div className="avatar small">{task.priority?.slice(0, 1) || "T"}</div>
                  <div>
                    <p>{task.title}</p>
                    <time>{task.status} - {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "Updated today"}</time>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="dashboard-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Recent activity</p>
                <h3>Timeline</h3>
              </div>
            </div>
            <div className="timeline-list">
              {activities.map((activity) => (
                <div key={activity._id} className="timeline-item">
                  <div className="avatar small">
                    {activity.actor?.avatar ? <img src={activity.actor.avatar} alt="" /> : "A"}
                  </div>
                  <div>
                    <p>{activity.message}</p>
                    <time>{new Date(activity.createdAt).toLocaleString()}</time>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="dashboard-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Projects</p>
                <h3>Progress Tracking</h3>
              </div>
            </div>
            <div className="progress-list">
              {projects.slice(0, 5).map((project) => (
                <div key={project._id}>
                  <div className="between">
                    <span>{project.title}</span>
                    <strong>{project.progress || 0}%</strong>
                  </div>
                  <div className="progress-track">
                    <span style={{ width: `${project.progress || 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      </main>
    </AppShell>
  );
}