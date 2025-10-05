import User from "../models/User.js";
import bcrypt from "bcryptjs";

export const initializeAdmin = async () => {
  try {
    const existingAdmin = await User.findOne({ role: "admin" });

    if (existingAdmin) {
      console.log("✅ Admin user already exists");
      return;
    }

    if (!process.env.ADMIN_MAIL || !process.env.ADMIN_PASSWORD || !process.env.ADMIN_NIC || !process.env.ADMIN_WALLET) {
      console.error("❌ Missing ADMIN_* environment variables. Admin not created.");
      return;
    }

    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);

    const admin = await User.create({
      name: "System Admin",
      email: process.env.ADMIN_MAIL,
      password: hashedPassword,
      role: "admin",
      nic: process.env.ADMIN_NIC,
      walletAddress: process.env.ADMIN_WALLET.toLocaleLowerCase(),
      kycStatus: "verified",
    });

    console.log(`🛠️ Admin user created: ${admin.email}`);
  } catch (error) {
    console.error("❌ Error creating admin user:", error.message);
  }
};
