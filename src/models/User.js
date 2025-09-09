import mongoose from "mongoose";
import { NIC_REGEX } from "../validation/nic.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    walletAddress: { type: String, unique: true },
    password: { type: String, required: true },
    nic: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: function (v) {
          return NIC_REGEX.test(v);
        },
        message: (props) => `${props.value} is not a valid NIC number!`,
      },
    },
    supremeCourtRollID: {
      type: String
    },
    rgdId: {
      type: String
    },
    governmentServiceID: {
      type: String
    },
    registryCode: {
      type: String
    },
    kycDocumentHash: { type: String },
    kycDocuments: {
      nicFrontSide: { type : String },
      nicBackSide: { type : String },
      userFrontImage: { type : String }
    },
    kycStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    role: {
      type: String,
      enum: ["user", "registrar", "admin", "notary", "lawyer"],
      default: "user",
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
