const User = require("../models/User");
const jwt = require("jsonwebtoken");

exports.registerUser = async (req, res) => {
  try {
    const { walletAddress, name, email, phoneNumber, kycDocumentHash } = req.body;

    let user = await User.findOne({ walletAddress });
    if (user) return res.status(400).json({ message: "User already exists" });

    user = new User({ walletAddress, name, email, phoneNumber, kycDocumentHash });
    await user.save();

    res.json({ message: "User registered successfully", user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findOne({ walletAddress: req.params.wallet });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
