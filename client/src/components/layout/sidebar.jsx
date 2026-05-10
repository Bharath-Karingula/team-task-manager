import { memo } from "react";
import {
  Activity,
  Bell,
  CheckSquare,
  FolderKanban,
  LayoutDashboard,
  Settings,
  ListChecks,
  Users
} from "lucide-react";
import { NavLink } from "react-router-dom";

const menu = [
  { title: "Dashboard", path: "/", icon: LayoutDashboard },
  { title: "Projects", path: "/projects", icon: FolderKanban },
  { title: "Tasks", path: "/tasks", icon: CheckSquare },
  { title: "Activity", path: "/activity", icon: Activity },
  { title: "Team", path: "/team", icon: Users },
  { title: "Notifications", path: "/notifications", icon: Bell },
  { title: "Settings", path: "/settings", icon: Settings }
];

// Show only the most important 5 items in bottom nav
const mobileMenu = [
  { title: "Dashboard", path: "/", icon: LayoutDashboard },
  { title: "Projects", path: "/projects", icon: FolderKanban },
  { title: "Tasks", path: "/tasks", icon: CheckSquare },
  { title: "Team", path: "/team", icon: Users },
  { title: "Settings", path: "/settings", icon: Settings }
];

function Sidebar() {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <div className="brand-dot"><ListChecks size={21} /></div>
          <div>
            <strong>Team Task Manager</strong>
          </div>
        </div>

        <nav>
          {menu.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.title}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) => (isActive ? "active" : "")}
              >
                <Icon size={19} />
                <span>{item.title}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Mobile bottom navigation */}
      <nav className="mobile-bottom-nav">
        {mobileMenu.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.title}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <Icon size={22} />
              <span>{item.title}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}

export default memo(Sidebar);