import express from "express";

import {
  createProject,
  getProjects,
  updateProject,
  deleteProject,
  inviteUser,
  removeUser
} from "../controllers/projectController.js";
import { authorize, protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.get("/", getProjects);

router.post("/", authorize("admin", "manager"), createProject);

router.put("/:id", updateProject);

router.delete("/:id", deleteProject);

router.post("/:id/invite", inviteUser);

router.delete("/:id/members/:userId", removeUser);

export default router;
