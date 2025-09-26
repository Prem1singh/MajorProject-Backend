import express from "express";

import { authMiddleware } from "../middleware/auth.js";
import {
  createBatch,
  getAllBatches,
  getBatchById,
  updateBatch,
  deleteBatch,
  getStudentsInBatch,
  getSubjectsByBatch,
  getAssignmentsByBatch,
  getAttendanceByBatch
} from "../controllers/batchController.js";

const router = express.Router();

// All routes protected
router.use(authMiddleware);

// CRUD
router.post("/", createBatch);
router.get("/", getAllBatches);
router.get("/:id", getBatchById);
router.put("/:id", updateBatch);
router.delete("/:id", deleteBatch);

// Extra
router.get("/:id/students", getStudentsInBatch);
router.get("/:id/subjects", getSubjectsByBatch);
router.get("/:batchId/assignments", getAssignmentsByBatch);

// GET attendance for a batch
router.get("/:batchId/attendance", getAttendanceByBatch);



export default router;
