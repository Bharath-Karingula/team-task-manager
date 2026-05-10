import express from "express";

import {
  createTask,
  getTasks,
  seedWorkflowTasks,
  updateTaskStatus,
  deleteTask,
  addComment,
  toggleReaction
} from "../controllers/taskController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.get("/", getTasks);

router.post("/", createTask);

router.post("/seed-workflow", seedWorkflowTasks);

router.put("/:id", updateTaskStatus);

router.delete("/:id", deleteTask);

router.post("/:id/comments", addComment);

router.post("/:id/reactions", toggleReaction);

export default router;
