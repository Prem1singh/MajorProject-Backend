import express from "express";
import {  loginUser, getProfile, updateUserProfile ,refreshToken,logout} from "../controllers/userController.js";
import { authMiddleware } from "../middleware/auth.js";
import uploadProfile from "../middleware/uploadProfile.js";
const router = express.Router();

router.post("/login", loginUser);
router.post("/refresh-token", refreshToken);
router.get("/profile", authMiddleware, getProfile);
router.put("/profile",authMiddleware,uploadProfile.single("profilePicture"),updateUserProfile);


export default router;
