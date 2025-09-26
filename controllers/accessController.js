// controllers/userController.js
import User from "../models/User.js";
import Batch from "../models/Batch.js";
import Subject from "../models/Subject.js";
import Course from "../models/Courses.js";


// -------------------------------
// Admin -> Get all Department Admins
// -------------------------------
export const getDepartmentAdminsByAdmin = async (req, res) => {
  try {
    if (req.user.role !== "Admin")
      return res.status(403).json({ message: "Access denied" });

    const deptAdmins = await User.find({ role: "DepartmentAdmin" })
      .select("name email empId createdAt")
      .select("-password");

    res.json({ deptAdmins });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
export const getTeachersByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;

    // 1. Find all teachers in this department
    const teachers = await User.find({
      department: departmentId,
      role: "Teacher",
    })
      .select("name email employeeId createdAt") // only needed fields
      .lean();

    if (!teachers.length) {
      return res.status(400).json({ message: "No teachers found for this department" });
    }

    // 2. Attach subjects for each teacher
    const enrichedTeachers = await Promise.all(
      teachers.map(async (teacher) => {
        const subjects = await Subject.find({ teacher: teacher._id })
          .select("name code semester type");

        return {
          ...teacher,
          subjects, // array of subject objects
        };
      })
    );

    res.json({ teachers: enrichedTeachers });
  } catch (err) {
    console.error("Error fetching teachers by department:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// -------------------------------
// Department Admin -> Get Teachers in their department
// -------------------------------
export const getTeachersByDepartmentAdmin = async (req, res) => {
  try {

    if (req.user.role !== "DepartmentAdmin"&&req.user.role !== "Admin")
      return res.status(403).json({ message: "Access denied" });
    const { departmentId } = req.params;

    // Get batches assigned to this department admin
    const batches = await Batch.find({ department: departmentId });

    const batchIds = batches.map(b => b._id);

    const teachers = await User.find({
      role: "Teacher",
      batch: { $in: batchIds }
    }).select("name email empId profilePicture createdAt");

    res.json({ teachers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// -------------------------------
// Department Admin -> Get Students in their department
// -------------------------------
export const getStudentsByDepartmentAdmin = async (req, res) => {
  try {
    if (req.user.role !== "DepartmentAdmin")
      return res.status(403).json({ message: "Access denied" });

    const batches = await Batch.find({ department: req.user.department });
    const batchIds = batches.map(b => b._id);

    const students = await User.find({
      role: "Student",
      batch: { $in: batchIds }
    }).select("name rollNo batch semester profilePicture createdAt");

    res.json({ students });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// -------------------------------
// Teacher -> Get Students in their batch/subjects
// -------------------------------
export const getStudentsByTeacher = async (req, res) => {
  try {
    if (req.user.role !== "Teacher")
      return res.status(403).json({ message: "Access denied" });

    const subjects = await Subject.find({ teacher: req.user._id });
    const batchIds = [...new Set(subjects.map(s => s.batch.toString()))];

    const students = await User.find({
      role: "Student",
      batch: { $in: batchIds }
    }).select("name rollNo batch semester profilePicture createdAt");

    res.json({ students });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// -------------------------------
// Student -> Get Teachers teaching their batch
// -------------------------------
export const getTeachersByStudent = async (req, res) => {
  try {
    if (req.user.role !== "Student")
      return res.status(403).json({ message: "Access denied" });

    const subjects = await Subject.find({ batch: req.user.batch, sem: req.user.semester }).populate("teacher", "name email empId profilePicture");
    
    const teachers = subjects.map(s => s.teacher);

    // Remove duplicates
    const uniqueTeachers = Array.from(new Map(teachers.map(t => [t._id.toString(), t])).values());

    res.json({ teachers: uniqueTeachers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// -------------------------------
// Get Students by Batch & Semester
// -------------------------------
export const getStudentsBySemester = async (req, res) => {
  try {
    const { batchId, semester } = req.query;

    if (!batchId || !semester)
      return res.status(400).json({ message: "Batch and Semester required" });

    const students = await User.find({
      role: "Student",
      batch: batchId,
      semester
    }).select("name rollNo batch semester profilePicture");

    res.status(200).json({ students });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch students" });
  }
};

// -------------------------------
// Get Teachers by Batch
// -------------------------------
export const getTeachersByBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    if (!batchId) return res.status(400).json({ message: "Batch ID is required" });

    const subjects = await Subject.find({ batch: batchId }).populate("teacher", "name email empId profilePicture");

    const teachers = subjects.map(s => s.teacher);

    // Remove duplicates
    const uniqueTeachers = Array.from(new Map(teachers.map(t => [t._id.toString(), t])).values());

    res.status(200).json({ teachers: uniqueTeachers });
  } catch (err) {
    console.error("Error fetching teachers:", err);
    res.status(500).json({ message: "Server Error" });
  }
};
