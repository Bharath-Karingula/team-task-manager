import { webcrypto } from "crypto";
if (!globalThis.crypto) globalThis.crypto = webcrypto;

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";

import { createServer } from "http";
import { Server } from "socket.io";

import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import activityRoutes from "./routes/activityRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import demoRoutes from "./routes/demoRoutes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const httpServer = createServer(app);

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:5001",
  "http://127.0.0.1:5001",
  process.env.CLIENT_URL
].filter(Boolean);

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true
  }
});

app.set("io", io);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/demo", demoRoutes);

// ── Serve built frontend ──────────────────────────────────────
const distPath = path.join(__dirname, "..", "..", "client", "dist");
app.use(express.static(distPath));

// All non-API routes return the React app
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

const onlineUsers = new Map();

const emitPresence = () => {
  io.emit(
    "presenceUpdated",
    Array.from(onlineUsers.entries()).map(([userId, value]) => ({
      userId,
      name: value.name,
      online: true
    }))
  );
};

io.on("connection", (socket) => {
  console.log("User Connected");

  socket.on("userOnline", (user) => {
    if (!user?._id) return;
    socket.data.userId = user._id;
    onlineUsers.set(user._id, {
      name: user.name,
      sockets: (onlineUsers.get(user._id)?.sockets || 0) + 1
    });
    emitPresence();
  });

  socket.on("taskUpdated", () => { io.emit("refreshTasks"); });
  socket.on("projectUpdated", () => { io.emit("projectUpdated"); });
  socket.on("activityUpdated", () => { io.emit("activityUpdated"); });
  socket.on("notificationUpdated", () => { io.emit("notificationUpdated"); });

  socket.on("disconnect", () => {
    const userId = socket.data.userId;
    if (userId && onlineUsers.has(userId)) {
      const current = onlineUsers.get(userId);
      if (current.sockets <= 1) {
        onlineUsers.delete(userId);
      } else {
        onlineUsers.set(userId, { ...current, sockets: current.sockets - 1 });
      }
      emitPresence();
    }
    console.log("User Disconnected");
  });
});

const PORT = process.env.PORT || 5001;

connectDB();

httpServer.listen(PORT, () => {
  console.log(`Server running on http://127.0.0.1:${PORT}`);
  console.log(`Serving frontend from: ${distPath}`);
});