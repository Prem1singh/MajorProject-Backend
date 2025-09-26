import bcrypt from "bcryptjs";
import { generateTokens } from "../util/generateTokens.js";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// LOGIN
export const loginUser = async (req, res) => {
  try {
    let { email, password } = req.body;

    email = email.trim().toLowerCase();

    const user = await User.findOne({ email });
    
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const { accessToken, refreshToken } = generateTokens(user);

    user.refreshToken = refreshToken;
    await user.save();

    res.status(200).json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        rollNo: user.rollNo,
        batch: user.batch,
        semester: user.semester,
        empId: user.employeeId,
        profileUrl: user.profileUrl,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Error logging in", error: err.message });
  }
};

// REFRESH TOKEN
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;   // ✅ changed from token → refreshToken
    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token required" });
    }

    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, async (err, decoded) => {
      if (err) return res.status(403).json({ message: "Invalid refresh token" });

      const user = await User.findById(decoded.id);
      if (!user || user.refreshToken !== refreshToken) {
        return res.status(403).json({ message: "Invalid refresh token" });
      }

      const accessToken = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
      );

      res.json({ accessToken });
    });
  } catch (err) {
    res.status(500).json({ message: "Error refreshing token", error: err.message });
  }
};


// LOGOUT
export const logout = async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findOne({ refreshToken: token });

    if (user) {
      user.refreshToken = null;
      await user.save();
    }

    res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error logging out", error: err.message });
  }
};

// GET PROFILE
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: "Error fetching profile", error: err.message });
  }
};

// UPDATE PROFILE
export const updateUserProfile = async (req, res) => {
  try {
    const disallowedFields = ["role", "rollNo", "employeeId"]; // fixed empId name
    const updates = { ...req.body }; // ✅ convert to plain object

    if (updates) {
      const updateKeys = Object.keys(updates);
      for (let key of updateKeys) {
        if (disallowedFields.includes(key)) {
          return res.status(400).json({ message: `Field ${key} cannot be updated` });
        }
      }
    }

    if (req.file && req.file.path) {
      updates.profileUrl = req.file.path; // ✅ match your user model
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({
      message: "Profile updated successfully",
      user,
    });
  } catch (err) {
    res.status(500).json({ message: "Error updating profile", error: err.message });
  }
};

