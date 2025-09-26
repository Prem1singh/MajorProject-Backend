import express from "express";
import {
  getDepartmentAdminsByAdmin,
  getTeachersByDepartmentAdmin,
  getStudentsByDepartmentAdmin,
  getStudentsByTeacher,
  getTeachersByStudent,
  getStudentsBySemester,
  getTeachersByDepartment
} from "../controllers/accessController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Admin -> Dept Admins
router.get("/admin/dept-admins", authMiddleware, getDepartmentAdminsByAdmin);
// /access/admin/teachers/${deptId}`
router.get("/admin/teachers/:departmentId", authMiddleware, getTeachersByDepartment);
router.get("/students", authMiddleware, getStudentsBySemester);

// Dept Admin -> Teachers & Students
router.get("/dept-admin/teachers", authMiddleware, getTeachersByDepartmentAdmin);
router.get("/dept-admin/students", authMiddleware, getStudentsByDepartmentAdmin);

// Teacher -> Students
router.get("/teacher/students", authMiddleware, getStudentsByTeacher);

// Student -> Teachers
router.get("/student/teachers", authMiddleware, getTeachersByStudent);

export default router;
