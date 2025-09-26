import bcrypt from "bcryptjs";
import User from "../models/User.js";

// 🚨 ONLY FOR TESTING PURPOSE 🚨
export const createAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if admin already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create Admin
    const admin = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "Admin", // 🔑 Fixed role
      profile: {}
    });

    res.status(201).json({
      message: "Admin created successfully (testing only)",
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Error creating admin", error: err.message });
  }
};
