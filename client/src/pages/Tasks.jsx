import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { gsap } from "gsap";
import {
  Calendar,
  CheckSquare2,
  ChevronDown,
  Database,
  Link2,
  MessageSquare,
  Paperclip,
  Plus,
  Repeat,
  ShieldAlert,
  Tags,
  Timer,
  UserRound,
  Zap
} from "lucide-react";
import toast from "react-hot-toast";

import AppShell from "../components/layout/AppShell";
import api from "../services/api";
import socket from "../services/socket";
import { getCurrentUser } from "../services/auth";

const statuses = ["Todo", "In Progress", "Review", "Completed"];
const priorities = ["Low", "Medium", "High", "Urgent"];
const reactionOptions = ["\u{1F44D}", "\u{1F525}", "\u2705", "\u{1F4A1}", "\u{1F389}"];

// ── Emoji + colour maps ───────────────────────────────────────
const statusEmoji = {
  "Todo": "📋",
  "In Progress": "🔄",
  "Review": "🔍",
  "Completed": "✅"
};

const statusColor = {
  "Todo": "todo",
  "In Progress": "in-progress",
  "Review": "review",
  "Completed": "completed"
};

const priorityEmoji = {
  Low: "🟢",
  Medium: "🟡",
  High: "🔴",
  Urgent: "🚨"
};

const priorityColor = {
  Low: "#10b981",
  Medium: "#f59e0b",
  High: "#ef4444",
  Urgent: "#dc2626"
};

const normalizeStatus = (status) => {
  const value = String(status || "").trim().toLowerCase();
  if (["todo", "to do", "new", "open"].includes(value)) return "Todo";
  if (["in progress", "progress", "doing", "active"].includes(value)) return "In Progress";
  if (["review", "in review", "qa", "testing"].includes(value)) return "Review";
  if (["completed", "complete", "done", "closed"].includes(value)) return "Completed";
  return "Todo";
};

const emptyTask = {
  title: "",
  description: "",
  priority: "Medium",
  status: "Todo",
  dueDate: "",
  labels: "",
  assignedMembers: [],
  estimatedTime: 0,
  trackedTime: 0,
  recurring: "None",
  checklist: "",
  subtasks: "",
  blockers: ""
};

export default function Tasks() {
  const scope = useRef(null);
  const seedAttempted = useRef(false);
  const boardRef = useRef(null);
  const [searchParams] = useSearchParams();
  const selectedTaskId = searchParams.get("taskId");
  const query = searchParams.get("search") || "";
  const currentUser = getCurrentUser();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(emptyTask);
  const [filter, setFilter] = useState("all");
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [comment, setComment] = useState({ taskId: "", body: "" });
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchData = async () => {
    try {
      const [taskRes, userRes, projectRes] = await Promise.all([
        api.get("/tasks"),
        api.get("/users"),
        api.get("/projects")
      ]);
      setTasks(taskRes.data);
      setUsers(userRes.data);
      setProjects(projectRes.data);
    } catch {
      setTasks([]);
      setUsers([]);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  // Seed using the full demo workspace (creates projects + tasks + members)
  const seedWorkspace = async ({ silent = false } = {}) => {
    setSeeding(true);
    try {
      const res = await api.post("/demo/seed");
      if (!silent) toast.success(res.data?.message || "✅ Demo workspace ready!");
      await fetchData();
    } catch (error) {
      if (!silent) toast.error(error.response?.data?.message || "Could not seed workspace");
    } finally {
      setSeeding(false);
    }
  };

  const clearAllData = async () => {
    if (!window.confirm("Delete ALL tasks and demo data? This cannot be undone.")) return;
    try {
      const res = await api.delete("/demo/clear");
      toast.success(res.data?.message || "🗑️ All data cleared!");
      seedAttempted.current = true; // prevent auto-seed after clear
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not clear data");
    }
  };

  useEffect(() => {
    fetchData();
    socket.on("refreshTasks", fetchData);
    return () => socket.off("refreshTasks", fetchData);
  }, []);

  // Auto-seed if no tasks found after first load
  useEffect(() => {
    if (loading) return;
    if (seedAttempted.current) return;
    if (tasks.length > 0) return;
    seedAttempted.current = true;
    seedWorkspace({ silent: true });
  }, [loading, tasks.length]);

  useEffect(() => {
    if (!tasks.length) return;
    const ctx = gsap.context(() => {
      gsap.from(".task-card", {
        y: 14,
        opacity: 0,
        duration: 0.42,
        stagger: 0.035,
        ease: "power3.out"
      });
    }, scope);
    return () => ctx.revert();
  }, [tasks.length, filter]);

  useEffect(() => {
    if (!selectedTaskId) return;
    const timer = setTimeout(() => {
      document.getElementById(`task-${selectedTaskId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center"
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [selectedTaskId, tasks.length]);

  const grouped = useMemo(() => {
    const term = query.trim().toLowerCase();
    return statuses.reduce((acc, status) => {
      acc[status] = tasks.filter((task) => {
        const matchesPriority = filter === "all" || task.priority === filter;
        const matchesSearch =
          !term ||
          [task.title, task.description, task.priority, task.status, ...(task.labels || [])].some((value) =>
            String(value || "").toLowerCase().includes(term)
          );
        return normalizeStatus(task.status) === status && matchesPriority && matchesSearch;
      });
      return acc;
    }, {});
  }, [tasks, filter, query]);

  const setValue = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const uniqueUsers = useMemo(() => {
    const seen = new Set();
    return users.filter((user) => {
      const key = (user.email || user.name || user._id).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [users]);

  const selectedUsers = useMemo(
    () => uniqueUsers.filter((user) => form.assignedMembers.includes(user._id)),
    [form.assignedMembers, uniqueUsers]
  );

  const normalizeList = (value) =>
    value.split(",").map((item) => item.trim()).filter(Boolean);

  const handleCreateTask = async (event) => {
    event.preventDefault();
    try {
      await api.post("/tasks", {
        ...form,
        labels: normalizeList(form.labels),
        checklist: normalizeList(form.checklist).map((title) => ({ title })),
        subtasks: normalizeList(form.subtasks).map((title) => ({ title })),
        blockers: normalizeList(form.blockers).map((title) => ({ title })),
        recurring: { enabled: form.recurring !== "None", cadence: form.recurring },
        estimatedTime: Number(form.estimatedTime),
        trackedTime: Number(form.trackedTime)
      });
      toast.success("✅ Task created!");
      setForm(emptyTask);
      setShowCreateForm(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Task creation failed");
    }
  };

  const updateTask = async (id, payload) => {
    try {
      await api.put(`/tasks/${id}`, payload);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Task update failed");
    }
  };

  const toggleAssignee = (userId) => {
    setForm((prev) => ({
      ...prev,
      assignedMembers: prev.assignedMembers.includes(userId)
        ? prev.assignedMembers.filter((id) => id !== userId)
        : [...prev.assignedMembers, userId]
    }));
  };

  const toggleReaction = async (taskId, emoji) => {
    try {
      await api.post(`/tasks/${taskId}/reactions`, { emoji });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Reaction failed");
    }
  };

  const handleComment = async (event) => {
    event.preventDefault();
    if (!comment.taskId || !comment.body) return;
    try {
      await api.post(`/tasks/${comment.taskId}/comments`, { body: comment.body });
      toast.success("💬 Comment added!");
      setComment({ taskId: "", body: "" });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Comment failed");
    }
  };

  const totalTasks = tasks.length;
  const completedCount = grouped["Completed"]?.length || 0;

  return (
    <AppShell title="Tasks" subtitle="Kanban workflow — move tasks across Todo · In Progress · Review · Completed">
      <main ref={scope} className="page-content tasks-page-content">

        {/* ── Toolbar bar ── */}
        <section className="tasks-hero-bar">
          {/* Status count pills */}
          <div className="tasks-stat-pills">
            {statuses.map((s) => (
              <span key={s} className={`tasks-stat-pill tsp-${statusColor[s]}`}>
                <span className="tsp-emoji">{statusEmoji[s]}</span>
                <span className="tsp-label">{s}</span>
                <strong className="tsp-count">{loading ? "…" : (grouped[s]?.length || 0)}</strong>
              </span>
            ))}
          </div>

          {/* Divider */}
          <div className="thb-divider" />

          {/* Priority filter buttons */}
          <div className="kanban-toolbar">
            <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All</button>
            {priorities.map((item) => (
              <button
                key={item}
                className={`${filter === item ? "active" : ""} pf-${item.toLowerCase()}`}
                onClick={() => setFilter(item)}
              >
                {priorityEmoji[item]} {item}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="thb-actions">
            <button
              className="secondary-button"
              type="button"
              disabled={seeding}
              onClick={() => seedWorkspace()}
            >
              <Database size={15} />
              {seeding ? "Loading…" : "Load Demo Tasks"}
            </button>
            <button
              className="secondary-button"
              type="button"
              style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
              onClick={clearAllData}
            >
              🗑️ Clear All
            </button>
            <button
              className="primary-button"
              type="button"
              onClick={() => setShowCreateForm((v) => !v)}
            >
              <Plus size={15} />
              {showCreateForm ? "Close" : "New Task"}
            </button>
          </div>
        </section>

        {/* ── Create Task form (collapsible) ── */}
        {showCreateForm && (
          <section className="task-command">
            <form className="dashboard-panel command-panel" onSubmit={handleCreateTask}>
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">New Task</p>
                  <h3>Create Task</h3>
                </div>
                <Zap size={20} />
              </div>

              <div className="form-grid">
                <label>
                  Title
                  <input value={form.title} onChange={(e) => setValue("title", e.target.value)} required />
                </label>
                <label>
                  Project
                  <select value={form.projectId || ""} onChange={(e) => setValue("projectId", e.target.value)}>
                    <option value="">No project</option>
                    {projects.map((project) => (
                      <option key={project._id} value={project._id}>{project.title}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Priority
                  <select value={form.priority} onChange={(e) => setValue("priority", e.target.value)}>
                    {priorities.map((p) => (
                      <option key={p} value={p}>{priorityEmoji[p]} {p}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Status
                  <select value={form.status} onChange={(e) => setValue("status", e.target.value)}>
                    {statuses.map((s) => (
                      <option key={s} value={s}>{statusEmoji[s]} {s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Due date
                  <input type="date" value={form.dueDate} onChange={(e) => setValue("dueDate", e.target.value)} />
                </label>
                <label className="wide">
                  Description
                  <textarea value={form.description} onChange={(e) => setValue("description", e.target.value)} />
                </label>
                <label>
                  Labels
                  <input value={form.labels} onChange={(e) => setValue("labels", e.target.value)} placeholder="frontend, qa" />
                </label>
                <div className="wide form-field">
                  <span>Assign members</span>
                  <div className="member-picker">
                    <button type="button" className="assignee-trigger" onClick={() => setAssigneeOpen((v) => !v)}>
                      <span>{selectedUsers.length ? selectedUsers.map((u) => u.name).join(", ") : "Select members"}</span>
                      <ChevronDown size={16} />
                    </button>
                    {assigneeOpen && (
                      <div className="assignee-menu">
                        {uniqueUsers.map((user) => (
                          <label key={user._id} className="assignee-option">
                            <input
                              type="checkbox"
                              checked={form.assignedMembers.includes(user._id)}
                              onChange={() => toggleAssignee(user._id)}
                            />
                            <span className="avatar small">
                              {user.avatar ? <img src={user.avatar} alt="" /> : user.name?.slice(0, 1)}
                            </span>
                            <span>
                              <strong>{user.name}</strong>
                              <small>{user.email}</small>
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <label>
                  Estimated time (h)
                  <input type="number" min="0" value={form.estimatedTime} onChange={(e) => setValue("estimatedTime", e.target.value)} />
                </label>
                <label>
                  Recurring
                  <select value={form.recurring} onChange={(e) => setValue("recurring", e.target.value)}>
                    <option>None</option>
                    <option>Daily</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                  </select>
                </label>
                <label>
                  Checklist items
                  <input value={form.checklist} onChange={(e) => setValue("checklist", e.target.value)} placeholder="Design, Review" />
                </label>
                <label>
                  Subtasks
                  <input value={form.subtasks} onChange={(e) => setValue("subtasks", e.target.value)} placeholder="API, UI" />
                </label>
                <label>
                  Blockers
                  <input value={form.blockers} onChange={(e) => setValue("blockers", e.target.value)} placeholder="Waiting on copy" />
                </label>
              </div>

              <button className="primary-button">
                <Plus size={18} />
                Create Task
              </button>
            </form>

            {/* ── Comments form ── */}
            <form className="dashboard-panel comment-panel" onSubmit={handleComment}>
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Comments</p>
                  <h3>Mention teammates</h3>
                </div>
                <MessageSquare size={20} />
              </div>
              <label>
                Task
                <select value={comment.taskId} onChange={(e) => setComment((prev) => ({ ...prev, taskId: e.target.value }))}>
                  <option value="">Select task</option>
                  {tasks.map((task) => (
                    <option key={task._id} value={task._id}>{task.title}</option>
                  ))}
                </select>
              </label>
              <label>
                Comment
                <textarea
                  value={comment.body}
                  onChange={(e) => setComment((prev) => ({ ...prev, body: e.target.value }))}
                  placeholder="Use @email to mention someone"
                />
              </label>
              <button className="secondary-button" type="submit">
                <MessageSquare size={18} />
                Add Comment
              </button>
            </form>
          </section>
        )}

        {/* ── Kanban Board ── */}
        <section ref={boardRef} className="task-board-section">
          {loading || seeding ? (
            <div className="kanban-loading">
              <div className="kanban-loading-inner">
                <span className="kanban-spinner" />
                <p>{seeding ? "⚡ Setting up your workspace with tasks…" : "Loading tasks…"}</p>
              </div>
            </div>
          ) : tasks.length === 0 ? (
            <div className="kanban-empty-state">
              <div className="kes-icons">
                {statuses.map((s) => (
                  <span key={s} className={`kes-icon kes-${statusColor[s]}`}>{statusEmoji[s]}</span>
                ))}
              </div>
              <h3>No tasks yet</h3>
              <p>Load the demo workspace to see tasks in all 4 columns, or create your first task.</p>
              <div className="kes-actions">
                <button className="primary-button" onClick={() => seedWorkspace()} disabled={seeding}>
                  <Database size={16} />
                  {seeding ? "Setting up…" : "Load Demo Tasks"}
                </button>
                <button className="secondary-button" onClick={() => setShowCreateForm(true)}>
                  <Plus size={16} />
                  Create Task
                </button>
              </div>
              <div className="kes-priority-preview">
                {priorities.map((p) => (
                  <span key={p} className={`kes-priority-badge kpb-${p.toLowerCase()}`}>
                    {priorityEmoji[p]} {p}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="kanban-board-topbar">
                <div className="kbt-stats">
                  <span>🗂️ <strong>{totalTasks}</strong> total</span>
                  <span>✅ <strong>{completedCount}</strong> done</span>
                  {totalTasks > 0 && (
                    <span className="kbt-progress-bar">
                      <span className="kbt-progress-fill" style={{ width: `${Math.round((completedCount / totalTasks) * 100)}%` }} />
                    </span>
                  )}
                  <span className="kbt-pct">{totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0}% complete</span>
                </div>
              </div>

              <div className="kanban-board">
                {statuses.map((status) => (
                  <KanbanColumn
                    key={status}
                    title={status}
                    tasks={grouped[status]}
                    updateTask={updateTask}
                    toggleReaction={toggleReaction}
                    currentUser={currentUser}
                    selectedTaskId={selectedTaskId}
                  />
                ))}
              </div>
            </>
          )}
        </section>

      </main>
    </AppShell>
  );
}

function KanbanColumn({ title, tasks, updateTask, toggleReaction, currentUser, selectedTaskId }) {
  const colorClass = statusColor[title];

  return (
    <div className={`kanban-column kanban-col-${colorClass}`}>
      <div className={`column-head column-head-${colorClass}`}>
        <h3>
          <span className="col-emoji">{statusEmoji[title]}</span>
          {title}
        </h3>
        <span className="col-count">{tasks.length}</span>
      </div>

      <div className="task-stack">
        {tasks.length === 0 && (
          <div className="empty-kanban-column">
            <span style={{ fontSize: "28px", display: "block", marginBottom: "6px" }}>{statusEmoji[title]}</span>
            No tasks here yet
          </div>
        )}
        {tasks.map((task) => (
          <TaskCard
            key={task._id}
            task={task}
            updateTask={updateTask}
            toggleReaction={toggleReaction}
            currentUser={currentUser}
            selectedTaskId={selectedTaskId}
          />
        ))}
      </div>
    </div>
  );
}

function TaskCard({ task, updateTask, toggleReaction, currentUser, selectedTaskId }) {
  const normStatus = normalizeStatus(task.status);
  const prio = task.priority || "Medium";

  return (
    <article
      id={`task-${task._id}`}
      className={`task-card ${selectedTaskId === task._id ? "selected-task" : ""}`}
    >
      {/* Priority + status row */}
      <div className="card-topline">
        <span className={`tc-priority-badge tcpb-${prio.toLowerCase()}`}>
          {priorityEmoji[prio]} {prio}
        </span>
        <span className={`status-pill status-${statusColor[normStatus]}`}>
          {statusEmoji[normStatus]} {normStatus}
        </span>
      </div>

      <h4 className="tc-title">{task.title}</h4>
      {task.description && <p className="tc-desc">{task.description}</p>}

      {/* Tags */}
      {(task.projectId?.title || task.labels?.length > 0) && (
        <div className="task-tags">
          {task.projectId?.title && (
            <span className="tt-project"><Link2 size={12} /> {task.projectId.title}</span>
          )}
          {task.labels?.map((label) => (
            <span key={label} className="tt-label"><Tags size={12} /> {label}</span>
          ))}
        </div>
      )}

      {/* Meta row */}
      <div className="task-facts">
        <span title="Due date"><Calendar size={13} /> {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}</span>
        <span title="Time tracked"><Timer size={13} /> {task.trackedTime || 0}/{task.estimatedTime || 0}h</span>
        <span title="Checklist"><CheckSquare2 size={13} /> {task.checklist?.filter((i) => i.checked).length || 0}/{task.checklist?.length || 0}</span>
        <span title="Comments"><MessageSquare size={13} /> {task.comments?.length || 0}</span>
        {task.blockers?.filter((b) => !b.resolved).length > 0 && (
          <span title="Blockers" className="tf-blocker"><ShieldAlert size={13} /> {task.blockers.filter((b) => !b.resolved).length} blocked</span>
        )}
        {task.recurring?.enabled && (
          <span title="Recurring"><Repeat size={13} /> {task.recurring.cadence}</span>
        )}
      </div>

      {/* Assigned members avatars */}
      {task.assignedMembers?.length > 0 && (
        <div className="avatar-stack">
          {task.assignedMembers.slice(0, 5).map((user) => (
            <div key={user._id} className="avatar small" title={user.name}>
              {user.avatar ? <img src={user.avatar} alt="" /> : user.name?.slice(0, 1) || <UserRound size={13} />}
            </div>
          ))}
          {task.assignedMembers.length > 5 && (
            <div className="avatar small avatar-overflow">+{task.assignedMembers.length - 5}</div>
          )}
        </div>
      )}

      {/* Reactions */}
      <div className="reaction-bar">
        {reactionOptions.map((emoji) => {
          const reaction = task.reactions?.find((r) => r.emoji === emoji);
          const reacted = reaction?.users?.some((uid) => String(uid) === currentUser?._id);
          return (
            <button
              key={emoji}
              type="button"
              className={`reaction-btn ${reacted ? "active" : ""}`}
              onClick={() => toggleReaction(task._id, emoji)}
              title={`React with ${emoji}`}
            >
              <span>{emoji}</span>
              {reaction?.users?.length > 0 && <strong>{reaction.users.length}</strong>}
            </button>
          );
        })}
      </div>

      {/* ── Status action buttons ── */}
      <div className="status-actions">
        {statuses.map((status) => {
          const isCurrent = normStatus === status;
          return (
            <button
              key={status}
              className={`status-action-btn status-action-${statusColor[status]} ${isCurrent ? "active" : ""}`}
              onClick={() => !isCurrent && updateTask(task._id, { status })}
              title={isCurrent ? `Currently ${status}` : `Move to ${status}`}
              disabled={isCurrent}
            >
              <span className="sa-emoji">{statusEmoji[status]}</span>
              <span className="sa-label">{status}</span>
            </button>
          );
        })}
      </div>
    </article>
  );
}