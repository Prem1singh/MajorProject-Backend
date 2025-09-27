import express from "express";
import { authMiddleware, authorizeRoles } from "../middleware/auth.js";
import upload from "../middleware/uploads.js"; // Cloudinary multer
import {
  uploadMaterial,
  getMaterialsForStudent,
  getMaterialsForTeacher, 
   editMaterial,
  deleteMaterial,
} from "../controllers/studyMaterialController.js";

const router = express.Router();

// Teacher upload
router.post(
  "/upload",
  authMiddleware,
  authorizeRoles("Teacher"),
  upload.single("file"), // Use Cloudinary multer middleware
  uploadMaterial
);

router.put("/:id", authMiddleware, authorizeRoles("Teacher"), upload.single("file"), editMaterial);
router.delete("/:id", authMiddleware, authorizeRoles("Teacher"), deleteMaterial);
// Teacher view their materials
router.get(
  "/teacher",
  authMiddleware,
  authorizeRoles("Teacher"),
  getMaterialsForTeacher
);

// Student view materials
router.get(
  "/student",
  authMiddleware,
  authorizeRoles("Student"),
  getMaterialsForStudent
);

export default router;
