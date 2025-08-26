import express from "express";
import multer from "multer";
import {
  registerUser,
  loginUser,
  uploadKYC,
  getProfile,
} from "../controllers/userController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();
const upload = multer();

// Public
router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected
router.get("/profile", authMiddleware, getProfile);
router.post("/upload-kyc", authMiddleware, upload.single("kyc"), uploadKYC);

export default router;
