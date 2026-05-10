import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { gsap } from "gsap";
import { Archive, Calendar, Globe2, Lock, Plus, Star, Trash2, UserPlus } from "lucide-react";
import toast from "react-hot-toast";

import AppShell from "../components/layout/AppShell";
import api from "../services/api";
import socket from "../services/socket";

const initialForm = {
  title: "",
  description: "",
  visibility: "Private",
  deadline: "",
  status: "Active",
  progress: 0
};

export default function Projects() {
  const scope = useRef(null);
  const [searchParams] = useSearchParams();
  const selectedProjectId = searchParams.get("projectId");
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [invite, setInvite] = useState({ projectId: "", email: "", role: "member" });

  const fetchProjects = async () => {
    try {
      const res = await api.get("/projects");
      setProjects(res.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load projects");
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchProjects, 0);
    socket.on("projectUpdated", fetchProjects);
    return () => {
      clearTimeout(timer);
      socket.off("projectUpdated", fetchProjects);
    };
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".project-card", {
        y: 20,
        opacity: 0,
        duration: 0.5,
        stagger: 0.06,
        ease: "power3.out"
      });
    }, scope);

    return () => ctx.revert();
  }, [projects.length]);

  useEffect(() => {
    if (!selectedProjectId) return;
    const timer = setTimeout(() => {
      document.getElementById(`project-${selectedProjectId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [selectedProjectId, projects.length]);

  const setValue = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleCreateProject = async (event) => {
    event.preventDefault();

    try {
      await api.post("/projects", form);
      toast.success("Project created");
      setForm(initialForm);
      fetchProjects();
    } catch (error) {
      toast.error(error.response?.data?.message || "Project creation failed");
    }
  };

  const updateProject = async (id, payload) => {
    try {
      await api.put(`/projects/${id}`, payload);
      fetchProjects();
    } catch (error) {
      toast.error(error.response?.data?.message || "Update failed");
    }
  };

  const deleteProject = async (id) => {
    try {
      await api.delete(`/projects/${id}`);
      toast.success("Project deleted");
      fetchProjects();
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    }
  };

  const handleInvite = async (event) => {
    event.preventDefault();
    if (!invite.projectId) return toast.error("Select a project first");

    try {
      await api.post(`/projects/${invite.projectId}/invite`, {
        email: invite.email,
        role: invite.role
      });
      toast.success("Invitation sent");
      setInvite({ projectId: "", email: "", role: "member" });
      fetchProjects();
    } catch (error) {
      toast.error(error.response?.data?.message || "Invite failed");
    }
  };

  return (
    <AppShell title="Projects" subtitle="Create, invite, archive, star, and track delivery.">
      <main ref={scope} className="page-content">
        <section className="project-command-grid">
          <form className="dashboard-panel command-panel" onSubmit={handleCreateProject}>
            <div className="panel-heading">
              <div>
                <p className="eyebrow">New project</p>
                <h3>Create Project</h3>
              </div>
              <Plus size={20} />
            </div>

            <div className="form-grid">
              <label>
                Title
                <input value={form.title} onChange={(e) => setValue("title", e.target.value)} required />
              </label>
              <label>
                Visibility
                <select value={form.visibility} onChange={(e) => setValue("visibility", e.target.value)}>
                  <option>Private</option>
                  <option>Public</option>
                </select>
              </label>
              <label className="wide">
                Description
                <textarea value={form.description} onChange={(e) => setValue("description", e.target.value)} />
              </label>
              <label>
                Deadline
                <input type="date" value={form.deadline} onChange={(e) => setValue("deadline", e.target.value)} />
              </label>
              <label>
                Status
                <select value={form.status} onChange={(e) => setValue("status", e.target.value)}>
                  <option>Planning</option>
                  <option>Active</option>
                  <option>At Risk</option>
                  <option>Completed</option>
                </select>
              </label>
              <label className="wide">
                Progress {form.progress}%
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={form.progress}
                  onChange={(e) => setValue("progress", Number(e.target.value))}
                />
              </label>
            </div>

            <button className="primary-button">
              <Plus size={18} />
              Create Project
            </button>
          </form>

          <form className="dashboard-panel command-panel" onSubmit={handleInvite}>
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Team</p>
                <h3>Invite Member</h3>
              </div>
              <UserPlus size={20} />
            </div>

            <label>
              Project
              <select value={invite.projectId} onChange={(e) => setInvite((prev) => ({ ...prev, projectId: e.target.value }))}>
                <option value="">Select project</option>
                {projects.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Email
              <input
                type="email"
                value={invite.email}
                onChange={(e) => setInvite((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
            </label>
            <label>
              Role
              <select value={invite.role} onChange={(e) => setInvite((prev) => ({ ...prev, role: e.target.value }))}>
                <option value="member">Member</option>
                <option value="manager">Project Manager</option>
              </select>
            </label>
            <button className="secondary-button">
              <UserPlus size={18} />
              Invite
            </button>
          </form>
        </section>

        <section className="project-grid">
          {projects.map((project) => (
            <article
              id={`project-${project._id}`}
              key={project._id}
              className={`project-card ${selectedProjectId === project._id ? "selected-card" : ""}`}
            >
              <div className="card-topline">
                <span className={`status-pill ${project.status?.replaceAll(" ", "-").toLowerCase()}`}>
                  {project.status}
                </span>
                <button onClick={() => updateProject(project._id, { favorite: !project.favorite })}>
                  <Star size={18} fill={project.favorite ? "currentColor" : "none"} />
                </button>
              </div>
              <h3>{project.title}</h3>
              <p>{project.description || "No description yet."}</p>

              <div className="project-meta">
                <span>{project.visibility === "Public" ? <Globe2 size={15} /> : <Lock size={15} />} {project.visibility}</span>
                <span><Calendar size={15} /> {project.deadline ? new Date(project.deadline).toLocaleDateString() : "No deadline"}</span>
              </div>

              <div className="progress-track">
                <span style={{ width: `${project.progress || 0}%` }} />
              </div>

              <div className="project-footer">
                <div className="avatar-stack">
                  {project.team?.slice(0, 4).map((member) => (
                    <div key={member._id || member.user?._id} className="avatar small">
                      {member.user?.avatar ? <img src={member.user.avatar} alt="" /> : member.user?.name?.slice(0, 1) || "U"}
                    </div>
                  ))}
                </div>
                <div className="card-actions">
                  <button onClick={() => updateProject(project._id, { archived: true })}>
                    <Archive size={17} />
                  </button>
                  <button onClick={() => deleteProject(project._id)}>
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>
    </AppShell>
  );
}
