import express from "express";
import { getUsers } from "../controllers/userController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.get("/", getUsers);

export default router;
