import express from "express";
import {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  getCoursesByDepartment,
} from "../controllers/courseController.js";

import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// CRUD
router.post("/", authMiddleware, createCourse);
router.get("/", authMiddleware, getCourses);
router.get("/:id", authMiddleware, getCourseById);
router.put("/:id", authMiddleware, updateCourse);
router.delete("/:id", authMiddleware, deleteCourse);


router.get("/department/:departmentId", authMiddleware, getCoursesByDepartment);



export default router;
