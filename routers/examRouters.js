import express from "express";
import {authMiddleware} from "../middleware/auth.js";
import { addExam, deleteExam, getExams, updateExam } from "../controllers/examController.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// GET /exams?batch=... → list exams for a batch
router.get("/", getExams);

// POST /exams → add new exam
router.post("/", addExam);

// DELETE /exams/:id → delete exam
router.delete("/:id", deleteExam);
router.put("/:id", updateExam);


export default router;
