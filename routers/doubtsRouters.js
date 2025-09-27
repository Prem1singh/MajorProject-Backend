import express from "express";
import { getAllDoubts, postDoubt, postAnswer, deleteDoubt, deleteAnswer } from "../controllers/doubtsController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Get all doubts for a batch
router.get("/", authMiddleware, getAllDoubts);

// Post a new doubt
router.post("/", authMiddleware, postDoubt);

// Post an answer
router.post("/:doubtId/answer", authMiddleware, postAnswer);
router.delete("/:doubtId", authMiddleware, deleteDoubt);

// Delete an answer
router.delete("/:doubtId/answer/:answerId", authMiddleware, deleteAnswer);

export default router;

