const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  walletAddress: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phoneNumber: { type: String },
  kycDocumentHash: { type: String }, //IPFS CID
  role: { type: String, enum: ["USER", "ADMIN"], default: "USER" },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
