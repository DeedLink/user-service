import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ipfsClient } from "../utils/ipfs.js";
import { NIC_REGEX } from "../validation/nic.js";
import { ethers } from "ethers";

// Register User with Wallet
export const registerUser = async (req, res) => {
  try {
    const { name, email, nic, password, walletAddress, signature, role } = req.body;

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
        const signerAddress = ethers.utils.verifyMessage(message, signature);
        if (signerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
          return res.status(400).json({ message: "Signature does not match wallet address" });
        }
      } catch (err) {
        return res.status(400).json({ message: "Invalid wallet signature" });
      }
    }

    let hashedPassword;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const user = await User.create({
      name,
      email,
      nic,
      walletAddress: walletAddress || null,
      password: hashedPassword || null,
      kycStatus: "pending",
      role: role || "user",
    });

    const token = jwt.sign(
      { id: user._id, email: user.email, walletAddress: user.walletAddress, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ user, token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login User
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

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
        const userId = '68ae98a55edb7b1f2cd21e34';
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

        console.log(uploadedDocs);

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
    await user.save();

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
