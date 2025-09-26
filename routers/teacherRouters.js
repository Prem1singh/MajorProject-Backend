import express from "express";
import { getMySubjects ,getStudentsForSubject,getExamsForSubject,getStudentsAndExamsForSubject,getTeacherOverview} from "../controllers/teacherController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// GET subjects for a given teacher
router.get("/subjects",authMiddleware, getMySubjects);
router.get("/subjects/:id/students", authMiddleware, getStudentsForSubject);
router.get("/subjects/:subject/students/exams", authMiddleware, getStudentsAndExamsForSubject);
router.get("/exams",authMiddleware, getExamsForSubject);
router.get("/overview", authMiddleware, getTeacherOverview);
export default router;
