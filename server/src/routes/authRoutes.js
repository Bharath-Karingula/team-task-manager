import express from "express";

import {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  me
} from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", register);

router.post("/login", login);

router.post("/refresh", refresh);

router.post("/logout", protect, logout);

router.post("/forgot-password", forgotPassword);

router.post("/reset-password", resetPassword);

router.get("/verify-email/:token", verifyEmail);

router.get("/me", protect, me);

export default router;
