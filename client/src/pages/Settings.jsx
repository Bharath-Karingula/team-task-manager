import { Moon, Shield, Sun, UserRound } from "lucide-react";

import AppShell from "../components/layout/AppShell";
import { useTheme } from "../context/ThemeContext";
import { getCurrentUser } from "../services/auth";

const permissionList = {
  admin: ["Full system access", "Create and manage projects", "Invite and remove users", "Manage teams"],
  manager: ["Manage assigned projects", "Create and update tasks", "Assign members"],
  member: ["Work only on assigned tasks", "Comment on tasks", "Update progress"]
};

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const user = getCurrentUser();
  const permissions = permissionList[user?.role] || permissionList.member;

  return (
    <AppShell title="Settings" subtitle="Profile, appearance, and role permissions.">
      <main className="page-content">
        <section className="settings-grid">
          <article className="dashboard-panel profile-panel">
            <div className="avatar large">
              {user?.avatar ? <img src={user.avatar} alt="" /> : user?.name?.slice(0, 1) || <UserRound size={28} />}
            </div>
            <h3>{user?.name || "User"}</h3>
            <p>{user?.email}</p>
            <span className="status-pill">{user?.role === "manager" ? "Project Manager" : user?.role}</span>
          </article>

          <article className="dashboard-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Appearance</p>
                <h3>Theme</h3>
              </div>
            </div>
            <div className="settings-actions">
              <button className={`secondary-button ${theme === "light" ? "active" : ""}`} onClick={() => setTheme("light")}>
                <Sun size={18} />
                Light
              </button>
              <button className={`secondary-button ${theme === "dark" ? "active" : ""}`} onClick={() => setTheme("dark")}>
                <Moon size={18} />
                Dark
              </button>
            </div>
          </article>

          <article className="dashboard-panel permissions-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Access control</p>
                <h3>Your permissions</h3>
              </div>
              <Shield size={22} />
            </div>
            <div className="permission-list">
              {permissions.map((permission) => (
                <span key={permission}>{permission}</span>
              ))}
            </div>
          </article>
        </section>
      </main>
    </AppShell>
  );
}
