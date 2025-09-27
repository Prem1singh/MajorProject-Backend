import Batch from "../models/Batch.js";
import User from "../models/User.js";
import Course from "../models/Courses.js";
import mongoose from "mongoose";
import Subject from "../models/Subject.js";
import Assignment from "../models/Assignment.js";
import AssignmentSubmission from "../models/AssignmentSubmission.js";
// Helper
const toObjectId = (id) => {
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return null;
  }
};

// ----------------- CREATE BATCH -----------------
export const createBatch = async (req, res) => {
  try {
    const { name, totalSem, year, dissertation, course, currentSem } = req.body;

    if (!name || !totalSem || !year || !course) {
      return res.status(400).json({ message: "Name, totalSem, year, and course are required" });
    }

    // validate currentSem
    if (currentSem && (currentSem < 1 || currentSem > totalSem)) {
      return res.status(400).json({ message: "Current semester must be between 1 and totalSem" });
    }

    const batch = new Batch({
      name,
      totalSem,
      year,
      dissertation: dissertation || false,
      course,
      currentSem: currentSem || 1, // default to 1 if not provided
      createdBy: req.user._id,
    });

    await batch.save();
    res.status(201).json({ message: "Batch created successfully", batch });
  } catch (err) {
    console.error("Create Batch Error:", err);
    res.status(500).json({ message: "Error creating batch", error: err.message });
  }
};

// ----------------- GET ALL BATCHES -----------------
export const getAllBatches = async (req, res) => {
  try {
    const { courseId } = req.query;

    let filter = {};

    // ✅ Filter by course if provided
    if (courseId) {
      filter.course = courseId;
    }

    // ✅ Restrict DepartmentAdmin to their own department
    if (req.user.role === "DepartmentAdmin") {
      // Find courses belonging to their department
      const courses = await Course.find({ department: req.user.department }).select("_id");
      const courseIds = courses.map(c => c._id);

      // Only include batches of these courses
      filter.course = filter.course ? courseId : { $in: courseIds };
    }

    // Admin can see all batches, no restrictions

    const batches = await Batch.find(filter).populate("course", "name code");

    res.status(200).json(batches);
  } catch (err) {
    console.error("Error fetching batches:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ----------------- GET BATCH BY ID -----------------
export const getBatchById = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id)
      .populate("course", "name code")
      .populate("createdBy", "name email");
    if (!batch) return res.status(404).json({ message: "Batch not found" });
    res.status(200).json(batch);
  } catch (err) {
    console.error("Get Batch Error:", err);
    res.status(500).json({ message: "Error fetching batch", error: err.message });
  }
};

// ----------------- UPDATE BATCH -----------------

export const updateBatch = async (req, res) => {
  try {
    // Find the batch first
    const batch = await Batch.findById(req.params.id);
    if (!batch) return res.status(404).json({ message: "Batch not found" });

    const oldSemester = batch.currentSem;
    const newSemester = req.body.currentSem;


    // Update the batch
    const updatedBatch = await Batch.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    )
      .populate("course", "name code")
      .populate("createdBy", "name email");

    // ✅ If semester has changed, update only students in this batch
    if (newSemester && newSemester !== oldSemester) {
      await User.updateMany(
        { batch: batch._id, role: "Student" }, // only students
        { semester: newSemester }
      );
    }

    res.status(200).json({ message: "Batch updated successfully", batch: updatedBatch });
  } catch (err) {
    console.error("Update Batch Error:", err);
    res.status(500).json({ message: "Error updating batch", error: err.message });
  }
};

// ----------------- DELETE BATCH -----------------
export const deleteBatch = async (req, res) => {
  try {
    if (req.user.role !== "DepartmentAdmin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { id } = req.params;

    const batch = await Batch.findById(id);
    if (!batch) {
      return res.status(404).json({ message: "Batch not found" });
    }

    // 🔹 Find all subjects in this batch
    const subjects = await Subject.find({ batch: batch._id });

    for (const subject of subjects) {
      // Find assignments for this subject
      const assignments = await Assignment.find({ subject: subject._id });

      // Delete all submissions for these assignments
      await AssignmentSubmission.deleteMany({
        assignment: { $in: assignments.map((a) => a._id) },
      });

      // Delete assignments
      await Assignment.deleteMany({ subject: subject._id });
    }

    // Delete subjects
    await Subject.deleteMany({ batch: batch._id });

    // 🔹 Delete students of this batch
    await User.deleteMany({ batch: batch._id, role: "Student" });

    // Finally, delete batch
    await batch.deleteOne();

    res.status(200).json({
      message: "Batch, related subjects, assignments, submissions, and students deleted successfully",
    });
  } catch (err) {
    console.error("Delete Batch Error:", err);
    res.status(500).json({
      message: "Error deleting batch",
      error: err.message,
    });
  }
};

// ----------------- GET STUDENTS IN BATCH -----------------
export const getStudentsInBatch = async (req, res) => {
  try {
    const batchId = req.params.id;
    const students = await User.find({ batch: batchId, role: "Student" })
      .select("-password")
      .populate("batch", "name year totalSem status");
    res.status(200).json(students);
  } catch (err) {
    console.error("Get Students in Batch Error:", err);
    res.status(500).json({ message: "Error fetching students", error: err.message });
  }
};

// ----------------- GET SUBJECTS BY BATCH -----------------
// ✅ Get subjects by batch (new model)
export const getSubjectsByBatch = async (req, res) => {
  try {
    const batchId = req.params.id;

    // ✅ First make sure batch exists
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({ message: "Batch not found" });
    }

    // ✅ Only fetch subjects for this batch's current semester
    const subjects = await Subject.find({
      batch: batchId,
      semester: batch.currentSem,   // filter by batch's current semester
    }).select("name code semester");

    res.status(200).json({
      batchId: batch._id,
      batchName: batch.name,
      currentSemester: batch.semester,
      subjects,
    });
  } catch (err) {
    console.error("Get Subjects by Batch Error:", err);
    res.status(500).json({
      message: "Error fetching subjects for batch",
      error: err.message,
    });
  }
};



export const getAssignmentsByBatch = async (req, res) => {
  try {
    const { batchId } = req.params;

    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ message: "Batch not found" });

    // Get all subjects in the batch's course
    const course = await Course.findById(batch.course).populate("semesters.subjects", "name code");
    if (!course) return res.status(404).json({ message: "Course not found for this batch" });

    const subjectIds = course.semesters.flatMap(s => s.subjects.map(sub => sub._id));

    // Fetch assignments for subjects of this batch/course
    const assignments = await Assignment.find({ subject: { $in: subjectIds } })
      .populate("subject", "name code")
      .populate("uploadedBy", "name email role");

    res.status(200).json({
      message: "Assignments fetched successfully",
      count: assignments.length,
      assignments
    });
  } catch (err) {
    console.error("getAssignmentsByBatch Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const getAttendanceByBatch = async (req, res) => {
  try {
    const { batchId } = req.params;

    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ message: "Batch not found" });

    const attendanceRecords = await Attendance.find({ batch: batchId })
      .populate("course", "name code")
      .populate("records.student", "name email rollNo")
      .sort({ date: -1 });

    res.status(200).json({
      message: "Attendance fetched successfully",
      count: attendanceRecords.length,
      attendance: attendanceRecords
    });
  } catch (err) {
    console.error("getAttendanceByBatch Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
