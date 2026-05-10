import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, FolderKanban, LogOut, Moon, Search, Sun, Users, CheckSquare } from "lucide-react";
import toast from "react-hot-toast";

import api from "../../services/api";
import socket from "../../services/socket";
import { clearSession, getCurrentUser, getRefreshToken } from "../../services/auth";
import { useTheme } from "../../context/ThemeContext";

export default function Navbar({ title = "Dashboard", subtitle = "Welcome back" }) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchData, setSearchData] = useState({ loaded: false, tasks: [], projects: [], users: [] });
  const [notifications, setNotifications] = useState([]);
  const user = getCurrentUser();
  const searchTerm = search.trim().toLowerCase();
  const isSearchActive = searchTerm.length > 1;

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  const results = useMemo(() => {
    if (!isSearchActive) return { tasks: [], projects: [], users: [] };

    return {
      tasks: searchData.tasks
        .filter((task) =>
          [task.title, task.description, task.priority, task.status].some((value) =>
            String(value || "").toLowerCase().includes(searchTerm)
          )
        )
        .slice(0, 4),
      projects: searchData.projects
        .filter((project) =>
          [project.title, project.description, project.status].some((value) =>
            String(value || "").toLowerCase().includes(searchTerm)
          )
        )
        .slice(0, 4),
      users: searchData.users
        .filter((member) =>
          [member.name, member.email, member.role].some((value) =>
            String(value || "").toLowerCase().includes(searchTerm)
          )
        )
        .slice(0, 4)
    };
  }, [isSearchActive, searchData, searchTerm]);

  const closeSearch = () => {
    setSearch("");
  };

  const openResult = (path) => {
    closeSearch();
    navigate(path);
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/notifications");
      setNotifications(res.data);
    } catch {
      setNotifications([]);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchNotifications, 0);
    socket.on("notificationUpdated", fetchNotifications);

    return () => {
      clearTimeout(timer);
      socket.off("notificationUpdated", fetchNotifications);
    };
  }, []);

  useEffect(() => {
    if (!isSearchActive || searchData.loaded) return undefined;

    const timer = setTimeout(async () => {
      try {
        const [taskRes, projectRes, userRes] = await Promise.all([
          api.get("/tasks"),
          api.get("/projects"),
          api.get("/users")
        ]);

        setSearchData({
          loaded: true,
          tasks: taskRes.data,
          projects: projectRes.data,
          users: userRes.data
        });
      } catch {
        setSearchData((prev) => ({ ...prev, loaded: true }));
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [isSearchActive, searchData.loaded]);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout", { refreshToken: getRefreshToken() });
    } catch {
      // Logout should continue even if the server-side session is already gone.
    } finally {
      clearSession();
      toast.success("Logged out");
      navigate("/login");
    }
  };

  const markAllRead = async () => {
    await api.put("/notifications/read-all");
    fetchNotifications();
  };

  const openNotification = async (notification) => {
    try {
      if (!notification.read) {
        api.put(`/notifications/${notification._id}/read`).then(fetchNotifications).catch(() => {});
      }
      setOpen(false);
      if (notification.task?._id) {
        navigate(`/tasks?taskId=${notification.task._id}`);
      } else if (notification.project?._id) {
        navigate("/projects");
      } else {
        navigate("/notifications");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not open notification");
    }
  };

  return (
    <header className="app-navbar">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <div className="nav-actions">
        <label className="search-box">
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              const firstTask = results.tasks[0];
              const firstProject = results.projects[0];
              const firstUser = results.users[0];
              if (firstTask) openResult(`/tasks?taskId=${firstTask._id}`);
              else if (firstProject) openResult(`/projects?projectId=${firstProject._id}`);
              else if (firstUser) openResult(`/team?userId=${firstUser._id}`);
            }}
            placeholder="Search projects, tasks, people"
          />
          {search.trim().length > 1 && (
            <div className="search-results">
              {[...results.tasks, ...results.projects, ...results.users].length === 0 && (
                <p className="muted">No matches found.</p>
              )}
              {results.tasks.map((task) => (
                <button key={task._id} type="button" onClick={() => openResult(`/tasks?taskId=${task._id}`)}>
                  <CheckSquare size={15} />
                  <span>{task.title}</span>
                </button>
              ))}
              {results.projects.map((project) => (
                <button key={project._id} type="button" onClick={() => openResult(`/projects?projectId=${project._id}`)}>
                  <FolderKanban size={15} />
                  <span>{project.title}</span>
                </button>
              ))}
              {results.users.map((member) => (
                <button key={member._id} type="button" onClick={() => openResult(`/team?userId=${member._id}`)}>
                  <Users size={15} />
                  <span>{member.name}</span>
                </button>
              ))}
            </div>
          )}
        </label>

        <div className="theme-switcher" aria-label="Theme">
          <button className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")}>
            <Sun size={16} />
          </button>
          <button className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")}>
            <Moon size={16} />
          </button>
        </div>

        <div className="notification-wrap">
          <button className="icon-nav-button" onClick={() => setOpen((value) => !value)}>
            <Bell size={19} />
            {unreadCount > 0 && <span>{unreadCount}</span>}
          </button>

          {open && (
            <div className="notification-panel">
              <div className="notification-head">
                <strong>Notifications</strong>
                <button onClick={markAllRead}>
                  <CheckCheck size={16} />
                  Read all
                </button>
              </div>

              <div className="notification-list">
                {notifications.length === 0 && <p className="muted">No notifications yet.</p>}
                {notifications.map((notification) => (
                  <article
                    key={notification._id}
                    className={!notification.read ? "unread clickable" : "clickable"}
                    onClick={() => openNotification(notification)}
                  >
                    <div className="avatar small">
                      {notification.actor?.avatar ? (
                        <img src={notification.actor.avatar} alt="" />
                      ) : (
                        notification.title?.slice(0, 1)
                      )}
                    </div>
                    <div>
                      <strong>{notification.title}</strong>
                      <p>{notification.message}</p>
                      <time>{new Date(notification.createdAt).toLocaleString()}</time>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>

        <button className="user-chip" type="button" onClick={() => navigate("/settings")}>
          <div className="avatar">
            {user?.avatar ? <img src={user.avatar} alt="" /> : user?.name?.slice(0, 1) || "U"}
          </div>
          <span>{user?.name || "User"}</span>
        </button>

        <button className="icon-nav-button" onClick={handleLogout}>
          <LogOut size={19} />
        </button>
      </div>
    </header>
  );
}
