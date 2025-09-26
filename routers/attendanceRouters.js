import express from "express";
import {
  markAttendance,
  updateAttendance,
  deleteAttendance,
  getAttendance,
  getAttendanceByStudentId,
  getOverallAttendance,
  // getAttendanceByStudentId

} from "../controllers/attendanceController.js";

import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();
router.get("/student/overall", authMiddleware, getOverallAttendance);

router.get("/student/:id", authMiddleware,getAttendance);
router.post("/", authMiddleware, markAttendance); // Teacher/Admin
router.get("/", authMiddleware, getAttendance); // Teacher/Admin
router.get("/student", authMiddleware, getAttendanceByStudentId); // Student/Teacher/Admin
// router.get("/date", authMiddleware, getAttendanceByDate); // All (requires ?date=YYYY-MM-DD)
router.put("/:id", authMiddleware, updateAttendance); // Teacher/Admin
router.delete("/", authMiddleware, deleteAttendance); // Admin only


export default router;
