// routes/adminRoutes.js
import express from "express";
import { addDepartment,createDepartmentAdmin, deleteDepartment, deleteDepartmentAdmin, getAdminOverview, getAllDepartmentAdmins, getAllDepartments, getCoursesByDepartment, updateDepartment, updateDepartmentAdmin,getBatchesByCourse,getStudentsByBatch } from "../controllers/adminController.js";
import { createAdmin } from "../controllers/createAdminController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();
router.post("/create-admin", createAdmin);
router.post("/department", authMiddleware, addDepartment);
router.get("/departments", authMiddleware, getAllDepartments);
router.put("/department/:id", authMiddleware, updateDepartment);
router.delete("/department/:id", authMiddleware, deleteDepartment);
router.get("/department/:deptId/courses", authMiddleware, getCoursesByDepartment);

router.post("/department-admin", authMiddleware, createDepartmentAdmin);
router.get("/department-admins", authMiddleware, getAllDepartmentAdmins);
router.put("/department-admin/:id", authMiddleware, updateDepartmentAdmin);
router.delete("/department-admin/:id", authMiddleware, deleteDepartmentAdmin);
router.get("/overview", authMiddleware, getAdminOverview);

router.get("/course/:courseId/batches", authMiddleware, getBatchesByCourse);

// ✅ Fetch students for a batch
router.get("/batches/:batchId/students", authMiddleware, getStudentsByBatch);


export default router;
