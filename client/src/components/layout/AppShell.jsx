import { useEffect, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "./navbar";
import Sidebar from "./sidebar";
import { getCurrentUser } from "../../services/auth";
import socket from "../../services/socket";

export default function AppShell({ children, title, subtitle }) {
  const location = useLocation();

  useEffect(() => {
    const user = getCurrentUser();
    if (user?._id) socket.emit("userOnline", user);
  }, []);

  useLayoutEffect(() => {
    const content = document.querySelector(".page-content");
    if (content) {
      content.scrollTop = 0;
      // Only reset horizontal scroll when navigating away from kanban pages
      if (!location.pathname.includes("/tasks")) {
        content.scrollLeft = 0;
      }
    }
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar title={title} subtitle={subtitle} />
        {children}
      </div>
    </div>
  );
}