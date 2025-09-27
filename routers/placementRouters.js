import express from "express";
import { authMiddleware, authorizeRoles } from "../middleware/auth.js";
import {
  addPlacement,
  getPlacements,
  deletePlacement,
} from "../controllers/placementController.js";

const router = express.Router();

// ✅ HOD / Department Admin: Add new placement
router.post("/", authMiddleware, authorizeRoles("DepartmentAdmin"), addPlacement);

// ✅ Students + Admin: Get placements
router.get("/", authMiddleware, getPlacements);

// ✅ HOD / Department Admin: Delete placement
router.delete("/:id", authMiddleware, authorizeRoles("DepartmentAdmin"), deletePlacement);

export default router;
