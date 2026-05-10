import express from "express";
import { seedDemoWorkspace, clearDemoData } from "../controllers/demoController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.post("/seed", seedDemoWorkspace);
router.delete("/clear", clearDemoData);

export default router;