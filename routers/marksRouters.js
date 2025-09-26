import express from "express";
import {
  addMarks,
  getStudentMarks,
  getMarks,
  updateBulkMarks,
  deleteMarks,
  getMarksForExam
} from "../controllers/marksController.js";

import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.post("/", authMiddleware, addMarks); // Teacher/Admin
// router.get("/student/:id", authMiddleware, getMarksByStudent); // Student/Admin/Teacher
router.get("/student", authMiddleware, getStudentMarks);
router.get("/", authMiddleware, getMarks); 
router.get("/exam", authMiddleware, getMarksForExam); 

// Teacher/Admin

router.put("/", authMiddleware, updateBulkMarks); // Teacher/Admin
router.delete("/", authMiddleware, deleteMarks); // Admin only

export default router;
