import express from "express";
import { getStudentOverview, getSubjectsForStudent } from "../controllers/studentController.js";

import { authMiddleware, authorizeRoles } from "../middleware/auth.js";

const router = express.Router();

// ✅ All student routes should use protect middleware
router.get("/overview", authMiddleware, getStudentOverview);

router.get(
    "/subjects",
    authMiddleware,
    authorizeRoles("Student"),
    getSubjectsForStudent
  );

export default router;
