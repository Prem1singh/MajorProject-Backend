import express from "express";
import { getStudentOverview } from "../controllers/studentController.js";

import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// ✅ All student routes should use protect middleware
router.get("/overview", authMiddleware, getStudentOverview);


export default router;
