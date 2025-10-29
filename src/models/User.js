import mongoose from "mongoose";
import { NIC_REGEX } from "../validation/nic.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: false },
    profilePicture: { type: String, require: false },
    email: { type: String, required: true, unique: true },
    walletAddress: { type: String, unique: true },
    password: { type: String, required: true },
    nic: {
      type: String,
      required: true,
      //unique: true,
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
    licensedSurveyorNumber: {
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
      enum: ["user", "registrar", "admin", "notary", "lawyer", "surveyor", "IVSL"],
      default: "user",
    },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);

//userSchema.index({ role: 1, name: 1 }, { unique: true });
//userSchema.index({ role: 1, walletAddress: 1 }, { unique: true }); just wallet address unique is enough no need to combine with role I guess, not guess, I like to change
userSchema.index({ role: 1, nic: 1 }, { unique: true });

export default mongoose.model("User", userSchema);
