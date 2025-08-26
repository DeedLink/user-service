import mongoose from "mongoose";
import { NIC_REGEX } from "../validation/nic";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    nic: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: function (v: any) {
          return NIC_REGEX.test(v);
        },
        message: (props: any) => `${props.value} is not a valid NIC number!`,
      },
    },
    kycDocumentHash: { type: String },
    kycStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    role: {
      type: String,
      enum: ["user", "registrar", "admin"],
      default: "user",
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
