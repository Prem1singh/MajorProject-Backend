import bcrypt from "bcryptjs";
import { generateTokens } from "../util/generateTokens.js";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Courses from "../models/Courses.js";

// LOGIN
export const loginUser = async (req, res) => {
  try {
    let { email, password } = req.body;

    email = email.trim().toLowerCase();

    const user = await User.findOne({ email }).populate("batch");
    
    if (!user) return res.status(404).json({ message: "User not found" });
   
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const { accessToken, refreshToken } = generateTokens(user);

    user.refreshToken = refreshToken;
    
    await user.save();
    let course
    if(user.role=="Student"){
       course=await Courses.findById(user.batch.course);
    }
  
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
        batch: user?.batch?._id,
        semester: user.semester,
        empId: user.employeeId,
        profileUrl: user.profileUrl,
        outcome:user.outcome,
        course:course?.name
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
    const user = await User.findById(req.user.id).select("-password").populate("batch");
    const course=await Courses.findById(user.batch.course);
    res.status(200).json({user:{
      id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      rollNo: user.rollNo,
      batch: user.batch._id,
      semester: user.semester,
      empId: user.employeeId,
      profileUrl: user.profileUrl,
      outcome:user.outcome,
      course:course.name
    }});
  } catch (err) {
    res.status(500).json({ message: "Error fetching profile", error: err.message });
  } 
};

// UPDATE PROFILE
export const updateUserProfile = async (req, res) => {
  try {
    const disallowedFields = ["role", "rollNo", "employeeId"];
    const updates = { ...req.body };

    // 1. Prevent updating disallowed fields
    const updateKeys = Object.keys(updates);
    for (let key of updateKeys) {
      if (disallowedFields.includes(key)) {
        return res.status(400).json({ message: `Field ${key} cannot be updated` });
      }
    }

    // 2. Handle profile picture upload
    if (req.files?.profilePicture) {
      updates.profileUrl = req.files.profilePicture[0].path;
    }

    // 3. Handle Student-specific Outcome Data
    if (req.user.role === "Student") {
      const outcomeData = {};
      if (req.files?.outcomeCertificate) {
        outcomeData.certificate = req.files.outcomeCertificate[0].path;
      }
      if (req.body.outcomeType) {
        outcomeData.type = req.body.outcomeType;
      }
      
      // Agar outcome data hai, tabhi updates mein add karein
      if (Object.keys(outcomeData).length > 0) {
        updates.outcome = outcomeData;
      }
    }

    // 4. Update User in Database
    // Populate batch is only useful for Students
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true }
    ).select("-password").populate("batch");

    if (!user) return res.status(404).json({ message: "User not found" });

    // 5. Smart Response Logic (Handles all roles)
    let courseName = "-";
    
    // Sirf Student aur jinke paas batch ho, unhi ke liye Course fetch karein
    if (user.role === "Student" && user.batch) {
      const courseData = await Courses.findById(user.batch.course);
      courseName = courseData ? courseData.name : "-";
    }

    // 6. Final Response
    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        // Role based fields (using optional chaining)
        rollNo: user.rollNo || null,
        empId: user.employeeId || null,
        batch: user.batch?._id || null,
        semester: user.semester || null,
        profileUrl: user.profileUrl,
        outcome: user.outcome || null,
        course: courseName // Will be "-" for Teachers/Admins
      }
    });

  } catch (err) {
    console.error("Profile Update Error:", err);
    res.status(500).json({ message: "Error updating profile", error: err.message });
  }
};

