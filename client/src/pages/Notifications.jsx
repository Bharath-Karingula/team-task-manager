import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import toast from "react-hot-toast";

import AppShell from "../components/layout/AppShell";
import api from "../services/api";
import socket from "../services/socket";

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get("/notifications");
      setNotifications(res.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchNotifications, 0);
    socket.on("notificationUpdated", fetchNotifications);

    return () => {
      clearTimeout(timer);
      socket.off("notificationUpdated", fetchNotifications);
    };
  }, [fetchNotifications]);

  const markRead = async (id) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification._id === id ? { ...notification, read: true } : notification
      )
    );

    try {
      await api.put(`/notifications/${id}/read`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update notification");
      fetchNotifications();
    }
  };

  const openNotification = (notification) => {
    if (!notification.read) {
      markRead(notification._id);
    }

    if (notification.task?._id) {
      navigate(`/tasks?taskId=${notification.task._id}`);
    } else if (notification.project?._id) {
      navigate(`/projects?projectId=${notification.project._id}`);
    }
  };

  const markAllRead = async () => {
    const previous = notifications;
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));

    try {
      await api.put("/notifications/read-all");
    } catch (error) {
      setNotifications(previous);
      toast.error(error.response?.data?.message || "Could not update notifications");
    }
  };

  return (
    <AppShell title="Notifications" subtitle="Task assignments, mentions, invitations, status, and deadline updates.">
      <main className="page-content">
        <section className="dashboard-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Notification center</p>
              <h3>Inbox</h3>
            </div>
            <button className="secondary-button" onClick={markAllRead}>
              <CheckCheck size={18} />
              Mark all read
            </button>
          </div>

          <div className="data-list">
            {loading && (
              <div className="empty-inline">
                <Bell size={24} />
                <p>Loading notifications...</p>
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div className="empty-inline">
                <Bell size={24} />
                <p>No notifications yet. Assign a task or change a deadline to see live updates.</p>
              </div>
            )}

            {notifications.map((notification) => (
              <article
                key={notification._id}
                className={`data-row notification-row clickable ${!notification.read ? "unread" : ""}`}
                onClick={() => openNotification(notification)}
              >
                <div className="avatar">
                  {notification.actor?.avatar ? <img src={notification.actor.avatar} alt="" /> : notification.title?.slice(0, 1)}
                </div>
                <div>
                  <strong>{notification.title}</strong>
                  <span>{notification.message}</span>
                  <time>{new Date(notification.createdAt).toLocaleString()}</time>
                </div>
                <span className="status-pill">{notification.type?.replaceAll("_", " ")}</span>
                {!notification.read && (
                  <button
                    className="secondary-button"
                    onClick={(event) => {
                      event.stopPropagation();
                      markRead(notification._id);
                    }}
                  >
                    Mark read
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
