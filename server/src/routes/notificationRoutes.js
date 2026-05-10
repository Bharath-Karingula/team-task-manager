import express from "express";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "../controllers/notificationController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.get("/", getNotifications);

router.put("/read-all", markAllNotificationsRead);

router.put("/:id/read", markNotificationRead);

export default router;
