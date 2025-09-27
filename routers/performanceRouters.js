import express from "express";
import { authMiddleware, authorizeRoles } from "../middleware/auth.js";
import {
  getStudentPerformance,
  getBatchPerformance,
  getSubjectPerformance,
  getDepartmentBatchPerformance,
  getDepartmentPerformance
} from "../controllers/performanceController.js";

const router = express.Router();

// Student → get own performance
router.get("/student", authMiddleware, authorizeRoles("Student"), getStudentPerformance);

// Teacher → batch performance
router.get("/batch/:batchId", authMiddleware, authorizeRoles("Teacher"), getBatchPerformance);

// Teacher → subject performance
router.get("/subject/:subjectId", authMiddleware, authorizeRoles("Teacher"), getSubjectPerformance);

// Department Admin → department batch performance with optional subject filter
router.get("/department/batch", authMiddleware, authorizeRoles("DepartmentAdmin"), getDepartmentBatchPerformance);

// Department Admin → department-wide performance (aggregate)
router.get("/department", authMiddleware, authorizeRoles("DepartmentAdmin"), getDepartmentPerformance);

export default router;
