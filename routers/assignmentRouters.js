import express from "express";
import {
  createAssignment,
  getMyAssignments,
  updateAssignment,
  deleteAssignment,
  submitAssignment,
  getAssignmentsByStudentId,
  getAssignmentsBySubject,
  getAssignmentsWithSubmissions,
  getSubmissionsByAssignment,
  updateSubmission
} from "../controllers/assignmentController.js";
import { authMiddleware } from "../middleware/auth.js";
import upload  from "../middleware/uploads.js";


 // multer config for file uploads

const router = express.Router();

// -----------------------------
// TEACHER / DEPT ADMIN ROUTES
// -----------------------------
router.post("/", authMiddleware, upload.single("file"), createAssignment); // ✅ create assignment
router.get("/my", authMiddleware, getMyAssignments); // ✅ get assignments created by logged-in teacher
router.put("/:id", authMiddleware, upload.single("file"), updateAssignment); // ✅ update assignment
router.delete("/:id", authMiddleware, deleteAssignment); // ✅ delete assignment
router.get("/:id/submissions", authMiddleware, getSubmissionsByAssignment); // ✅ get assignments created by logged-in teacher
router.get("/:subjectId", getAssignmentsBySubject);
router.get("/submissions/:subjectId", authMiddleware, getAssignmentsWithSubmissions);

router.patch(
  "/:assignmentId/submissions/:submissionId",
  authMiddleware,
  updateSubmission
);
// -----------------------------
// STUDENT ROUTES
// -----------------------------
router.post("/:id/submit", authMiddleware, upload.single("file"), submitAssignment); // ✅ student submit
router.get("/student/:id", authMiddleware, getAssignmentsByStudentId); // ✅ get assignments submitted by student

export default router;
