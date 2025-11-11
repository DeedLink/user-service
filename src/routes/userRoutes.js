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
  searchUser,
  getAdminAccessKey,
  verifyAdminOTP,
  registerDepartmentUser,
  setPasswordForUnsetDepartmentUser,
  uploadProfilePicture,
  getUsersByRole,
  getEmailByWalletAddress,
} from "../controllers/userController.js";
import { adminMiddleware, authMiddleware } from "../middleware/authMiddleware.js";
import { requireRole } from "../validation/role.js";
import { internalAccessMiddleware } from "../middleware/internalAccess.js";

const router = express.Router();
const upload = multer();

// Public
router.post("/register", registerUser);
router.post("/register-department-user", registerDepartmentUser);
router.post("/set-password-for-unset-department-user", setPasswordForUnsetDepartmentUser);
router.post("/set-password", setPasswordForUnsetUser);
router.post("/login", loginUser);
router.get("/status/:walletAddress", getUserStatus);
router.get("/email/:walletAddress", internalAccessMiddleware, getEmailByWalletAddress);
router.get("/status/password/:walletAddress", getUserPasswordStatus);
router.get("/role", getRole);
router.get("/search-user", searchUser);
router.get("/admin/:walletAddress", getAdminAccessKey);
router.post("/admin/verify", verifyAdminOTP);

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
router.post("/profile-picture", authMiddleware, upload.single("profilePicture"), uploadProfilePicture);

// Admin/Registrar verifies KYC
router.patch("/:id/verify-kyc", authMiddleware, adminMiddleware, requireRole("registrar"), verifyKYC);

// List pending KYC
router.get("/pending-kyc", authMiddleware, adminMiddleware, requireRole("registrar"), listPendingKYC);

//For testing those must be restricted
router.get("/", getUsers);

//Later
router.get("/role/:role", getUsersByRole);

export default router;
