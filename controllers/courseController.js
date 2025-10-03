// controllers/courseController.js
import Course from "../models/Courses.js";
import Batch from "../models/Batch.js";
import Subject from "../models/Subject.js";
import Assignment from "../models/Assignment.js";
import AssignmentSubmission from "../models/AssignmentSubmission.js";
import User from "../models/User.js";
import Courses from "../models/Courses.js";
import { cascadeDeleteCourse } from "../util/cascade.js";

// ----------------- CREATE COURSE -----------------
export const createCourse = async (req, res) => {
  try {
    const { name, code } = req.body;

    if (!name || !code) {
      return res.status(400).json({ message: "Name and code are required" });
    }

    const departmentId = req.user?.department?._id;
    if (!departmentId) {
      return res.status(400).json({ message: "User does not belong to any department" });
    }

    const course = new Course({ name, code, department: departmentId });
    await course.save();

    res.status(201).json({ message: "Course created successfully", course });
  } catch (err) {
    res.status(500).json({ message: "Error creating course", error: err.message });
  }
};

// ----------------- GET ALL COURSES -----------------
export const getCourses = async (req, res) => {
  try {
    let query = {};

    // ✅ Restrict DepartmentAdmin to their own department
    if (req.user.role === "DepartmentAdmin") {
      query.department = req.user.department;
    }

    // ✅ Teachers and Students should also only see their own department’s courses
    if (req.user.role === "Teacher" || req.user.role === "Student") {
      query.department = req.user.department;
    }

    // ✅ Admin can see all courses
    const courses = await Course.find(query).populate("department", "name");

    res.status(200).json(courses);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching courses", error: err.message });
  }
};


// ----------------- GET COURSE BY ID -----------------
export const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate("department", "name");
    if (!course) return res.status(404).json({ message: "Course not found" });
    res.status(200).json(course);
  } catch (err) {
    res.status(500).json({ message: "Error fetching course", error: err.message });
  }
};

// ----------------- UPDATE COURSE -----------------
export const updateCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate("department", "name");

    if (!course) return res.status(404).json({ message: "Course not found" });
    res.status(200).json({ message: "Course updated successfully", course });
  } catch (err) {
    res.status(500).json({ message: "Error updating course", error: err.message });
  }
};

// ----------------- DELETE COURSE -----------------
export const deleteCourse = async (req, res) => {
  try {
    if (req.user.role !== "DepartmentAdmin" && req.user.role !== "Admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { id } = req.params;
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // ✅ Call centralized cascade manager
    await cascadeDeleteCourse(course._id);
    await Courses.findByIdAndDelete(course._id);
    res.status(200).json({
      message: "Course and all related data deleted successfully",
    });
  } catch (err) {
    console.error("Delete Course Error:", err);
    res.status(500).json({ message: "Error deleting course", error: err.message });
  }
};
export const getCoursesByDepartment = async (req, res) => {
  try {
    const deptId = req.params.departmentId;

    const department = await Department.findById(deptId);
    if (!department) return res.status(404).json({ message: "Department not found" });

    const courses = await Course.find({ department: deptId }).select("name code totalSem");

    res.status(200).json({
      message: "Courses fetched successfully",
      count: courses.length,
      courses
    });
  } catch (err) {
    console.error("getCoursesByDepartment Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
