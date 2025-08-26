import express from "express";
import multer from "multer";
import {
  registerUser,
  loginUser,
  uploadKYC,
  getProfile,
  verifyKYC,
  listPendingKYC,
} from "../controllers/userController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireRole } from "../validation/role.js";

const router = express.Router();
const upload = multer();

// Public
router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected
router.get("/profile", authMiddleware, getProfile);
router.post("/upload-kyc", authMiddleware, upload.single("kyc"), uploadKYC);

// Admin/Registrar verifies KYC
router.patch("/:id/verify-kyc", authMiddleware, requireRole("registrar"), verifyKYC);

// List pending KYC
router.get("/pending-kyc", authMiddleware, requireRole("registrar"), listPendingKYC);

export default router;
