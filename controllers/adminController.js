// controllers/adminController.js
import bcrypt from "bcryptjs";

import Department from "../models/Department.js";
import Course from "../models/Courses.js";
import Batch from "../models/Batch.js";
import Subject from "../models/Subject.js";
import User from "../models/User.js";
import Assignment from "../models/Assignment.js";
import AssignmentSubmission from "../models/AssignmentSubmission.js";
import Attendance from "../models/Attendance.js";
import Marks from "../models/Marks.js";


import { sendCredentialsEmail } from "../util/emailService.js";

// --------------------
// ADD NEW DEPARTMENT
// --------------------
export const addDepartment = async (req, res) => {
  try {
    if (req.user.role !== "Admin")
      return res.status(403).json({ message: "Access denied. Admins only." });

    const { name, code } = req.body;

    // Check if department already exists
    const existingDept = await Department.findOne({ code });
    if (existingDept)
      return res.status(400).json({ message: "Department code already exists" });

    const department = await Department.create({ name, code });
    res.status(201).json({ message: "Department added successfully", department });
  } catch (err) {
    res.status(500).json({ message: "Error adding department", error: err.message });
  }
};

export const getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.find().sort({ name: 1 });
    res.status(200).json(departments);
  } catch (err) {
    res.status(500).json({ message: "Error fetching departments", error: err.message });
  }
};

export const updateDepartment = async (req, res) => {
  try {
    if (req.user.role !== "Admin"&&req.user.role !== "DepartmentAdmin") {
      return res.status(403).json({ message: "Only Admins/DepartmentAdmin can update departments" });
    }

    const { id } = req.params;
    const updates = req.body; // { name, code, description }

    const department = await Department.findByIdAndUpdate(id, updates, { new: true });
    if (!department) return res.status(404).json({ message: "Department not found" });

    res.status(200).json({ message: "Department updated successfully", department });
  } catch (err) {
    res.status(500).json({ message: "Error updating department", error: err.message });
  }
};


export const deleteDepartment = async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({ message: "Only Admins can delete departments" });
    }

    const { id } = req.params;

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    // 🔹 Find all courses under this department
    const courses = await Course.find({ department: id });

    for (const course of courses) {
      // 🔹 Find all batches under this course
      const batches = await Batch.find({ course: course._id });

      for (const batch of batches) {
        // 🔹 Find all subjects under this batch
        const subjects = await Subject.find({ batch: batch._id });

        for (const subject of subjects) {
          // Delete all assignments + submissions
          const assignments = await Assignment.find({ subject: subject._id });
          for (const assign of assignments) {
            await AssignmentSubmission.deleteMany({ assignment: assign._id });
          }
          await Assignment.deleteMany({ subject: subject._id });

          // Delete attendance + marks
          await Attendance.deleteMany({ subject: subject._id });
          await Marks.deleteMany({ subject: subject._id });
        }

        // Delete subjects
        await Subject.deleteMany({ batch: batch._id });
      }

      // Delete batches
      await Batch.deleteMany({ course: course._id });
    }

    // Delete courses
    await Course.deleteMany({ department: id });

    // Delete users (teachers + students) in this department
    await User.deleteMany({ department: id });

    // Finally, delete the department itself
    await Department.findByIdAndDelete(id);

    res.status(200).json({ message: "✅ Department and all related data deleted successfully" });
  } catch (err) {
    console.error("Cascade Delete Error:", err);
    res.status(500).json({ message: "Error deleting department", error: err.message });
  }
};


// Get courses by department
export const getCoursesByDepartment = async (req, res) => {
  try {
    const { deptId } = req.params;
    if (req.user.role !== "Admin")
      return res.status(403).json({ message: "Access denied. Admins only." });

    // check department exists
    const department = await Department.findById(deptId);
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    // get all courses of this department
    const courses = await Course.find({ department: deptId });

    res.status(200).json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Add department Admin

export const createDepartmentAdmin = async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const { name, email, password, departmentId } = req.body;

    // Validate inputs
    if (!name || !email || !password || !departmentId) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Check if department exists
    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    // 🔥 Check if department already has an admin
    const existingDeptAdmin = await User.findOne({
      role: "DepartmentAdmin",
      "profile.department": departmentId,
    });

    if (existingDeptAdmin) {
      return res.status(400).json({
        message: `Department '${department.name}' already has an admin assigned.`,
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new Department Admin
    const departmentAdmin = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "DepartmentAdmin",
      department: departmentId ,
    });

    // Send credentials email
    await sendCredentialsEmail(email, name, password, "Department Admin");

    res.status(201).json({
      message: `Department Admin for '${department.name}' created successfully. Credentials sent via email.`,
      departmentAdmin,
    });
  } catch (err) {
    console.error("Error creating Department Admin:", err);
    res.status(500).json({
      message: "Error creating Department Admin",
      error: err.message,
    });
  }
};




export const getAllDepartmentAdmins = async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const departmentAdmins = await User.find({ role: "DepartmentAdmin" })
      .populate("department", "name");

    res.status(200).json(departmentAdmins);
  } catch (err) {
    res.status(500).json({ message: "Error fetching Department Admins", error: err.message });
  }
};

export const updateDepartmentAdmin = async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const { id } = req.params;
    const { name, email, password, departmentId } = req.body;

    const departmentAdmin = await User.findById(id);
    if (!departmentAdmin || departmentAdmin.role !== "DepartmentAdmin") {
      return res.status(404).json({ message: "Department Admin not found" });
    }

    // ✅ Update fields
    if (name) departmentAdmin.name = name;
    if (email) departmentAdmin.email = email;
    if (password) {
      departmentAdmin.password = await bcrypt.hash(password, 10);
    }

    // ✅ Handle department reassignment
    if (departmentId) {
      const department = await Department.findById(departmentId);
      if (!department) {
        return res.status(404).json({ message: "Department not found" });
      }

      // 🔥 Check if another admin already exists for this department
      const existingDeptAdmin = await User.findOne({
        role: "DepartmentAdmin",
        "department": departmentId,
        _id: { $ne: id }, // exclude the current admin being updated
      });

      if (existingDeptAdmin) {
        return res.status(400).json({
          message: `Department '${department.name}' already has an admin assigned.`,
        });
      }

      departmentAdmin.department = department._id;
    }

    await departmentAdmin.save();

    res.status(200).json({
      message: "Department Admin updated successfully",
      departmentAdmin,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error updating Department Admin",
      error: err.message,
    });
  }
};


export const deleteDepartmentAdmin = async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const { id } = req.params;

    const departmentAdmin = await User.findById(id);
    if (!departmentAdmin || departmentAdmin.role !== "DepartmentAdmin") {
      return res.status(404).json({ message: "Department Admin not found" });
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({ message: "Department Admin deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting Department Admin", error: err.message });
  }
};




// ✅ 1. Get all batches of a course
export const getBatchesByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const batches = await Batch.find({ course: courseId })
      .select("_id name startYear endYear")
      .sort({ startYear: -1 });

    if (!batches.length) {
      return res.status(404).json({ message: "No batches found for this course" });
    }

    res.json({ batches });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ 2. Get students of a batch
export const getStudentsByBatch = async (req, res) => {
  try {
    const { batchId } = req.params;

    const students = await User.find({ role: "Student", batch: batchId })
      .select("name email rollNo");

    if (!students.length) {
      return res.status(404).json({ message: "No students found for this batch" });
    }

    res.json({ students });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



export const getAdminOverview = async (req, res) => {
  try {
   
    if (req.user.role !== "Admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Top level counts
    const departments = await Department.countDocuments();
    const courses = await Course.countDocuments();
    const students = await User.countDocuments({ role: "Student" });
    const teachers = await User.countDocuments({ role: "Teacher" });
    const assignments = await Assignment.countDocuments();

    // Attendance summary
    const attendancePresent = await Attendance.countDocuments({ status: "Present" });
    const attendanceTotal = await Attendance.countDocuments();

    // Recent Department Admins (last 5)
    const recentAdmins = await User.find({ role: "DepartmentAdmin" })
  .populate({
    path: "profile.department",
    select: "name",
    options: { strictPopulate: false }, // prevents crash if field missing
  })
  .sort({ createdAt: -1 })
  .limit(5)
  .select("_id name profile.department");

// Students per department
const studentsPerDept = await User.aggregate([
  { $match: { role: "Student", "department": { $ne: null } } }, // ensure department exists
  {
    $lookup: {
      from: "departments",
      localField: "department",
      foreignField: "_id",
      as: "dept",
    },
  },
  { $unwind: "$dept" },
  {
    $group: { _id: "$dept.name", students: { $sum: 1 } },
  },
  { $project: { department: "$_id", students: 1, _id: 0 } },
]);
    // Attendance distribution
    const attendanceAgg = await Attendance.aggregate([
      { $group: { _id: "$status", value: { $sum: 1 } } },
      { $project: { status: "$_id", value: 1, _id: 0 } },
    ]);


    res.json({
      overview: {
        departments,
        courses,
        students,
        teachers,
        assignments,
        attendancePresent,
        attendanceTotal,
        recentAdmins,
      },
      studentsPerDept,
      attendance: attendanceAgg,
      
    });
  } catch (error) {
    console.error("Admin Overview Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};




