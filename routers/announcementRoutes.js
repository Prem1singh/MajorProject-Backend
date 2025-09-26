import express from "express"
const router = express.Router();
import { createAnnouncement, deleteAnnouncement, getAnnouncements, getAnnouncementsBySubject, getAnnouncementsForStudent, updateAnnouncement } from "../controllers/announcementController.js";
import { authMiddleware, authorizeRoles } from "../middleware/auth.js";
// -------------------- Teacher Routes --------------------

// Create announcement (Teacher only)
router.post(
  "/",
  authMiddleware,
  authorizeRoles("Teacher"),
  createAnnouncement
);

// Get all announcements (Teacher) - optional subject filter
router.get(
  "/",
  authMiddleware,
  authorizeRoles("Teacher"),
  getAnnouncements
);

// Get announcements by subject (Teacher)
router.get(
  "/subject/:subjectId",
  authMiddleware,
  authorizeRoles("Teacher"),
  getAnnouncementsBySubject
);

// Update announcement (Teacher only)
router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("Teacher"),
  updateAnnouncement
);

// Delete announcement (Teacher only)
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("Teacher"),
  deleteAnnouncement
);

// -------------------- Student Routes --------------------

// Get announcements for student (based on enrolled subjects)
router.get(
  "/student",
  authMiddleware,
  authorizeRoles("Student"),
  getAnnouncementsForStudent
);

export default router;
