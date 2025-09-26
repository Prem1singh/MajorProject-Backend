import express from "express";
import { requestPasswordReset, resetPassword } from "../controllers/authController.js";

const router = express.Router();

// Request reset link
router.post("/request-reset", requestPasswordReset);

// Reset password
router.post("/reset-password/:token", resetPassword);

export default router;
