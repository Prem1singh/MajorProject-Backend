import express from "express";
import {
  createNotification,
  getUserNotifications,
  deleteNotification,
} from "../controllers/notificationController.js";

import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Teacher/Admin can send notifications
router.post("/", authMiddleware, createNotification);

// User can fetch their notifications
router.get("/", authMiddleware, getUserNotifications);

// Mark notification as read
// router.put("/:id/read", authMiddleware, markAsRead);

// Delete notification
router.delete("/:id", authMiddleware, deleteNotification);

export default router;
