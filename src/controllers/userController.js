import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ipfsClient } from "../utils/ipfs.js";
import { NIC_REGEX } from "../validation/nic.js";

// Login Regisration
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, nic } = req.body;

    if (!NIC_REGEX.test(nic)) {
      return res.status(400).json({ message: "Invalid NIC number" });
    }
    const existing = await User.findOne({ $or: [{ email }, { nic }] });
    if (existing) {
      return res.status(400).json({ message: "Email or NIC already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      nic,
    });

    const token = jwt.sign(
      { id: user._id, email: user.email },
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

// Upload KYC Document to IPFS
export const uploadKYC = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!req.file) return res.status(400).json({ message: "File missing" });

    const file = req.file.buffer;
    const added = await ipfsClient.add(file);
    const user = await User.findByIdAndUpdate(userId, { kycDocumentHash: added.path }, { new: true });

    res.json({ message: "KYC uploaded", kycDocumentHash: added.path, user });
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