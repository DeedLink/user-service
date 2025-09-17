import express from "express";
import multer from "multer";
import {
  getUsers,
  registerUser,
  loginUser,
  getProfile,
  verifyKYC,
  listPendingKYC,
  uploadKYCPDF,
  uploadKYCImages,
  getUserStatus,
  setPasswordForUnsetUser,
  getRole,
  getUserPasswordStatus,
} from "../controllers/userController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireRole } from "../validation/role.js";

const router = express.Router();
const upload = multer();

// Public
router.post("/register", registerUser);
router.post("/set-password", setPasswordForUnsetUser);
router.post("/login", loginUser);
router.get("/status/:walletAddress", getUserStatus);
router.get("/status/password/:walletAddress", getUserPasswordStatus);
router.get("/role", getRole);

// Protected
router.get("/profile", authMiddleware, getProfile);
router.post("/upload-kyc-pdf", authMiddleware, upload.single("kyc"), uploadKYCPDF);
router.post("/upload-kyc",
    upload.fields([
        { name: "nicFrontSide", maxCount: 1 },
        { name: "nicBackSide", maxCount: 1 },
        { name: "userFrontImage", maxCount: 1 }
    ]),
    uploadKYCImages
);

// Admin/Registrar verifies KYC
router.patch("/:id/verify-kyc", authMiddleware, requireRole("registrar"), verifyKYC);

// List pending KYC
router.get("/pending-kyc", authMiddleware, requireRole("registrar"), listPendingKYC);

//For testing those must be restricted
router.get("/", getUsers);

export default router;
