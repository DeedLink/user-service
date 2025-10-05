import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ipfsClient } from "../utils/ipfs.js";
import { NIC_REGEX } from "../validation/nic.js";
import { verifyMessage } from "ethers";
import { generateOTP } from "../utils/otp.js";
import { sendEmail } from "../utils/email.js";

// Register User with Wallet
export const registerUser = async (req, res) => {
  try {
    const { name, email, nic, walletAddress, signature, role } = req.body;

    if (!NIC_REGEX.test(nic)) {
      return res.status(400).json({ message: "Invalid NIC number" });
    }

    const existing = await User.findOne({ $or: [{ email }, { nic }, { walletAddress }] });
    if (existing) {
      return res.status(400).json({ message: "Email, NIC, or Wallet already exists" });
    }

    if (walletAddress && signature) {
      const message = `Registering wallet: ${walletAddress}`;
      try {
        const signerAddress = verifyMessage(message, signature);
        if (signerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
          return res.status(400).json({ message: "Signature does not match wallet address" });
        }
      } catch (err) {
        return res.status(400).json({ message: "Invalid wallet signature" });
      }
    }

    console.log(req.body);

    const user = await User.create({
      name,
      email,
      nic,
      walletAddress: walletAddress || null,
      password: "unset",
      kycStatus: "pending",
      role: role || "user"
    });

    console.log("User created:", user);

    const token = jwt.sign(
      { id: user._id, email: user.email, walletAddress: user.walletAddress, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ user, token });
  } catch (error) {
    console.error("registerUser error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Set password for users who registered via wallet and have no password set
export const setPasswordForUnsetUser = async (req, res) => {
  try {
    const { email, walletAddress, signature, newPassword, confirmPassword, otp } = req.body;
    if (!newPassword) {
      return res.status(400).json({ message: "newPassword is required" });
    }
    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }
    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Password and confirmPassword do not match" });
    }

    let query = null;
    if (email) query = { email };
    else if (walletAddress) query = { walletAddress };
    else return res.status(400).json({ message: "Provide id or email or walletAddress to identify the user" });

    const user = await User.findOne(query);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.password && user.password !== "unset") {
      return res.status(400).json({ message: "User already has a password set" });
    }

    if (walletAddress) {
      if (!signature) {
        return res.status(400).json({ message: "Signature required for wallet address flow" });
      }
      const message = `Setting password for wallet: ${walletAddress}`;
      try {
        const signerAddress = verifyMessage(message, signature);
        if (signerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
          return res.status(400).json({ message: "Signature does not match wallet address" });
        }
      } catch (err) {
        return res.status(400).json({ message: "Invalid wallet signature" });
      }
    }

    if(user.resetPasswordExpires && user.resetPasswordExpires < Date.now()) {
      return res.status(400).json({ message: "The password reset token has expired. Please contact support." });
    }

    if(user.resetPasswordToken && !otp) {
      return res.status(400).json({ message: "OTP is required to set the password. Please check your email." });
    }

    if(!user.resetPasswordToken) {
      return res.status(400).json({ message: "No password reset token found. Please contact support." });
    }

    if(user.resetPasswordToken) {
      const isMatch = await bcrypt.compare(otp, user.resetPasswordToken);
      if (!isMatch) {
        return res.status(400).json({ message: "Invalid password reset token. Please contact support." });
      }
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email, walletAddress: user.walletAddress, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const userSafe = user.toObject();
    delete userSafe.password;

    return res.json({ message: "Password set successfully", user: userSafe, token });
  } catch (error) {
    console.error("setPasswordForUnsetUser error:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

// Login User
export const loginUser = async (req, res) => {
  try {
    const { email, password, walletAddress } = req.body;
    const user = await User.findOne({ email });
    if (!user || user.walletAddress!=walletAddress) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ user, token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Upload KYC Document to IPFS / Single PDF version
export const uploadKYCPDF = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!req.file) return res.status(400).json({ message: "File missing" });

    const file = req.file.buffer;
    const added = await ipfsClient.add(file, "pdf");
    const user = await User.findByIdAndUpdate(userId, { kycDocumentHash: added.path }, { new: true });

    res.json({ message: "KYC uploaded", kycDocumentHash: added.path, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Upload KYC Documents to IPFS / Images version
export const uploadKYCImages = async (req, res) => {
    try {
        const userId = req.body.userId;
        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({ message: "Files missing" });
        }
        const uploadedDocs = {};

        console.log(uploadedDocs);

        for (const [key, fileArr] of Object.entries(req.files)) {
            const file = fileArr[0];
            const added = await ipfsClient.add(file.buffer, "png");
            uploadedDocs[key] = added.path;
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { kycDocuments: uploadedDocs },
            { new: true }
        );

        res.json({
            message: "KYC uploaded",
            kycDocuments: uploadedDocs,
            user
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get Profile
export const getProfile = async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  res.json(user);
};

// Admin/Registrar verifies KYC
export const verifyKYC = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["verified", "rejected"].includes(status))
    return res.status(400).send("Invalid status");

  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).send("User not found");

    user.kycStatus = status;

    const otp = generateOTP(6);
    const hashedOTP = await bcrypt.hash(otp, 10);
    user.resetPasswordToken = hashedOTP;
    user.resetPasswordExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await user.save();

    await sendEmail({
      to: user.email,
      subject: "Your account has been verified",
      text: `Hello ${user.name}, your KYC verification is now complete. 
            Your KYC Verification Key is: ${otp}. It expires in 24 hours.`,
      html: `
        <p>Hello <b>${user.name}</b>,</p>
        <p>Your KYC verification is now <b>verified</b>. You can now access all features.</p>
        <p>Your KYC Verification Key is: <b>${otp}</b></p>
        <p><i>(Expires in 24 hours)</i></p>
      `,
    });


    res.send({ message: `KYC ${status}`, user });
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// Admin/Listing KYC
export const listPendingKYC = async (_req, res) => {
  try {
    const users = await User.find({ kycStatus: "pending" });
    res.send(users);
  } catch (err) {
    res.status(500).send(err.message);
  }
};

//Get all users
export const getUsers = async (_req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//Get user status (public)
export const getUserStatus = async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });

    if (!user) {
      return res.status(200).json({
        walletAddress,
        status: "not_registered",
      });
    }

    return res.status(200).json({
      walletAddress,
      kycStatus: user.kycStatus,
      userData: {
        name: user.name,
        email: user.email
      },
    });
  } catch (error) {
    console.error("Error fetching user status:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

//Get user password status (public)
export const getUserPasswordStatus = async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });

    if (!user) {
      return res.status(200).json({
        walletAddress,
        passwordStatus: "not_registered",
      });
    }

    return res.status(200).json({
      walletAddress,
      passwordStatus: user.password === "unset" ? "unset" : "set",
      userData: {
        name: user.name,
        email: user.email
      },
    });
  } catch (error) {
    console.error("Error fetching user password status:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

//Get user role by token passing with the header (public)
export const getRole = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization header missing or malformed" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Token missing" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      role: user.role
    });
  } catch (error) {
    console.error("Error fetching user role:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Search user by name, email, or wallet address (public)
export const searchUser = async (req, res) => {
  console.log("Search user called with query:", req.query);
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ message: "Query parameter is required" });
    }

    const regex = new RegExp(query, 'i');
    const users = await User.find({
      $or: [
        { name: regex },
        { email: regex },
        { walletAddress: regex }
      ]
    }).select('-password');

    res.json(users);
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get admin key (public)
export const getAdminAccessKey = async (req, res) => {
  try {
    const { walletAddress } = req.params;
    console.log(walletAddress)

    if (!walletAddress || typeof walletAddress !== "string") {
      return res.status(400).json({ message: "Invalid wallet address" });
    }

    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    if(user.role != "admin"){
      return res.status(400).json({
        walletAddress: user.walletAddress,
        status: "not an admin",
      });
    }

    if (!user) {
      return res.status(200).json({
        walletAddress,
        status: "not_registered",
      });
    }

    const otp = generateOTP(6);
    const hashedOTP = await bcrypt.hash(otp, 10);

    user.resetPasswordToken = hashedOTP;
    user.resetPasswordExpires = new Date(Date.now() + 1 * 60 * 60 * 1000);
    await user.save();

    await sendEmail({
      to: user.email,
      subject: "Admin Access Key",
      text: `Hello ${user.name}, Your access Key is: ${otp}. It expires in 1 hour.`,
      html: `
        <p>Hello <b>${user.name}</b>,</p>
        <p>Your access Key is: <b>${otp}</b></p>
        <p><i>(Expires in 1 hour)</i></p>
      `,
    });

    return res.status(200).json({
      walletAddress: user.walletAddress,
      status: "otp_sent",
    });
  } catch (error) {
    console.error("Error fetching user status:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Verify admin
export const verifyAdminOTP = async (req, res) => {
  const { walletAddress, otp } = req.body;
  const user = await User.findOne({ walletAddress: walletAddress.toLowerCase(), role: "admin" });

  if (!user) return res.status(404).json({ message: "Admin user not found" });
  if (!user.resetPasswordToken || !user.resetPasswordExpires) return res.status(400).json({ message: "No OTP requested" });
  if (user.resetPasswordExpires < new Date()) return res.status(400).json({ message: "OTP expired" });

  const isValid = await bcrypt.compare(otp, user.resetPasswordToken);
  if (!isValid) return res.status(400).json({ message: "Invalid OTP" });

  const token = jwt.sign(
    { id: user._id, email: user.email, walletAddress: user.walletAddress, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  return res.status(200).json({
    message: "Admin access granted",
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
};