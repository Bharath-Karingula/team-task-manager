import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Mail, ShieldCheck, UserRoundCog, UsersRound } from "lucide-react";
import toast from "react-hot-toast";

import AppShell from "../components/layout/AppShell";
import api from "../services/api";
import socket from "../services/socket";
import { getCurrentUser } from "../services/auth";

const roleText = {
  admin: "Full system access, project control, invites, removals, and team management.",
  manager: "Manage assigned projects, create and update tasks, and assign members.",
  member: "Work only on assigned tasks, add comments, and update task progress."
};

export default function Team() {
  const [users, setUsers] = useState([]);
  const [searchParams] = useSearchParams();
  const selectedUserId = searchParams.get("userId");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const user = useMemo(() => getCurrentUser(), []);
  const userId = user?._id;
  const userName = user?.name;

  const memberships = useMemo(() => {
    const projectsByUser = projects.reduce((map, project) => {
      project.team?.forEach((member) => {
        const userId = member.user?._id;
        if (!userId) return;
        const currentProjects = map.get(userId) || [];
        if (!currentProjects.some((item) => item._id === project._id)) {
          currentProjects.push(project);
        }
        map.set(userId, currentProjects);
      });

      return map;
    }, new Map());

    return users.map((teamUser) => {
      const assignedProjects = projectsByUser.get(teamUser._id) || [];

      return { ...teamUser, assignedProjects };
    });
  }, [projects, users]);

  useEffect(() => {
    const loadTeam = async () => {
      try {
        const [userRes, projectRes] = await Promise.all([api.get("/users"), api.get("/projects")]);
        setUsers(userRes.data);
        setProjects(projectRes.data);
      } catch (error) {
        toast.error(error.response?.data?.message || "Could not load team");
      }
    };

    loadTeam();
  }, []);

  useEffect(() => {
    const handlePresence = (presence) => setOnlineUsers(presence.map((item) => item.userId));
    socket.on("presenceUpdated", handlePresence);
    if (userId) socket.emit("userOnline", { _id: userId, name: userName });

    return () => socket.off("presenceUpdated", handlePresence);
  }, [userId, userName]);

  useEffect(() => {
    if (!selectedUserId) return;
    const timer = setTimeout(() => {
      document.getElementById(`member-${selectedUserId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [selectedUserId, memberships.length]);

  return (
    <AppShell title="Team" subtitle="Roles, permissions, and project membership.">
      <main className="page-content">
        <section className="role-grid">
          {Object.entries(roleText).map(([role, text]) => (
            <article key={role} className={`dashboard-panel role-card ${user?.role === role ? "active" : ""}`}>
              <ShieldCheck size={22} />
              <h3>{role === "manager" ? "Project Manager" : role}</h3>
              <p>{text}</p>
            </article>
          ))}
        </section>

        <section className="dashboard-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Members</p>
              <h3>Team Directory</h3>
            </div>
            <UsersRound size={22} />
          </div>

          <div className="data-list">
            {memberships.map((member) => (
              <article
                id={`member-${member._id}`}
                key={member._id}
                className={`data-row ${selectedUserId === member._id ? "selected-card" : ""}`}
              >
                <div className="avatar">
                  {member.avatar ? <img src={member.avatar} alt="" /> : member.name?.slice(0, 1)}
                </div>
                <div>
                  <strong>{member.name}</strong>
                  <span>
                    <Mail size={14} />
                    {member.email}
                  </span>
                </div>
                <span className={`status-pill ${onlineUsers.includes(member._id) ? "online" : "offline"}`}>
                  {onlineUsers.includes(member._id) ? "Online" : "Offline"}
                </span>
                <span className="status-pill">{member.role === "manager" ? "Project Manager" : member.role}</span>
                <div className="assigned-projects">
                  {member.assignedProjects.length ? (
                    member.assignedProjects.slice(0, 3).map((project) => <span key={project._id}>{project.title}</span>)
                  ) : (
                    <span>No project assigned</span>
                  )}
                </div>
                <UserRoundCog size={18} className="muted-icon" />
              </article>
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
