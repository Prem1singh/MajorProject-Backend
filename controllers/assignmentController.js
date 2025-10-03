// controllers/assignmentController.js
import Assignment from "../models/Assignment.js";
import AssignmentSubmission from "../models/AssignmentSubmission.js";
import User from "../models/User.js";
import Batch from "../models/Batch.js";

// -----------------------------
// CREATE ASSIGNMENT (Teacher/Dept Admin)
// -----------------------------

import Subject from "../models/Subject.js";
import { cascadeDeleteAssignment } from "../util/cascade.js";

export const createAssignment = async (req, res) => {
  try {
    if (!["Teacher", "DepartmentAdmin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only teachers or dept admins can create assignments" });
    }

    const { title, description, subjectId, marks, deadline } = req.body;

    if (!title || !subjectId || !marks) {
      return res.status(400).json({ message: "Title, subject, and marks are required" });
    }

    // Check subject exists
    const subject = await Subject.findById(subjectId).populate("batch", "name");
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    // Extra check: teacher can only create assignment for their own subject
    if (
      req.user.role === "Teacher" &&
      subject.teacher?.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "You are not assigned to this subject" });
    }

    const newAssignment = await Assignment.create({
      title,
      description,
      subject: subjectId,           // ✅ now linked to subject
      batch: subject.batch,         // ✅ auto-fill from subject
      marks,
      deadline,
      createdBy: req.user._id,
      fileUrl: req.file?.path || "",
    });

    res.status(201).json({
      message: "Assignment created successfully",
      assignment: newAssignment,
    });
  } catch (err) {
    console.error("Create Assignment Error:", err);
    res.status(500).json({ message: "Error creating assignment", error: err.message });
  }
};

export const getMyAssignments = async (req, res) => {
  try {
    // Step 1️⃣: Find assignments created by teacher (with subject + batch info)
    const assignments = await Assignment.find({ createdBy: req.user._id })
      .populate({
        path: "subject",
        select: "name code semester batch",
        populate: {
          path: "batch",
          select: "name year currentSem",
        },
      })
      .sort({ createdAt: -1 })
      .lean();

    // Step 2️⃣: Filter only those assignments whose subject.semester === batch.currentSem
    const currentSemAssignments = assignments.filter(
      (a) =>
        a.subject &&
        a.subject.batch &&
        a.subject.semester === a.subject.batch.currentSem
    );

    if (!currentSemAssignments.length) {
      return res.status(404).json({ message: "No assignments found for current semester" });
    }

    res.status(200).json({ assignments: currentSemAssignments });
  } catch (err) {
    console.error("Error fetching assignments:", err);
    res.status(500).json({
      message: "Error fetching assignments",
      error: err.message,
    });
  }
};


// ✅ Update assignment (only if owner)
export const updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // only the teacher/admin who created it can update
    if (assignment.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to update this assignment" });
    }

    const { title, description, marks, deadline } = req.body;

    if (title !== undefined) assignment.title = title;
    if (description !== undefined) assignment.description = description;
    if (marks !== undefined) assignment.marks = marks;
    if (deadline !== undefined) assignment.deadline = deadline;

    if (req.file) {
      assignment.fileUrl = req.file.path; // assuming multer handles file upload
    }

    await assignment.save();

    res.status(200).json({ message: "Assignment updated successfully", assignment });
  } catch (err) {
    console.error("Error updating assignment:", err);
    res.status(500).json({ message: "Error updating assignment", error: err.message });
  }
};

// ✅ Delete assignment (only if owner)
export const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // Only creator (Teacher / DeptAdmin) can delete
    if (assignment.createdBy.toString() !== req.user._id.toString() && req.user.role !== "DepartmentAdmin") {
      return res.status(403).json({ message: "Not authorized to delete this assignment" });
    }

    await cascadeDeleteAssignment(assignment._id)

   await Assignment.deleteOne(assignment._id)

    res.status(200).json({ message: "Assignment and related submissions deleted successfully" });
  } catch (err) {
    console.error("Error deleting assignment:", err);
    res.status(500).json({
      message: "Error deleting assignment",
      error: err.message,
    });
  }
};


// -----------------------------
// SUBMIT ASSIGNMENT (Student)
// -----------------------------
export const submitAssignment = async (req, res) => {
  try {
    if (req.user.role !== "Student") {
      return res.status(403).json({ message: "Only students can submit assignments" });
    }

    if (!req.file) return res.status(400).json({ message: "File is required" });

    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });

    const alreadySubmitted = await AssignmentSubmission.findOne({
      assignment: req.params.id,
      student: req.user._id,
    });

    if (alreadySubmitted) return res.status(400).json({ message: "Already submitted" });

    const submission = await AssignmentSubmission.create({
      assignment: req.params.id,
      student: req.user._id,
      fileUrl: req.file.path,
      status: "submitted",
    });

    res.status(200).json({ message: "Assignment submitted successfully", submission });
  } catch (err) {
    res.status(500).json({ message: "Error submitting assignment", error: err.message });
  }
};

// -----------------------------
// GET ASSIGNMENTS SUBMITTED BY STUDENT
// -----------------------------
export const getAssignmentsByStudentId = async (req, res) => {
  try {
    const studentId = req.params.id;

    const submissions = await AssignmentSubmission.find({ student: studentId })
      .populate("assignment", "title batch deadline marks uploadedBy")
      .populate("student", "name rollNo profilePicture");

    res.status(200).json(submissions);
  } catch (err) {
    console.error("Error fetching submissions:", err);
    res.status(500).json({ message: "Error fetching submissions", error: err.message });
  }
};

export const getSubmissionsByAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    // Check assignment exists
    const assignment = await Assignment.findById(id).populate("subject", "name code");
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // Only allow teacher/admin who created it to view submissions
    if (req.user.role === "Teacher" && assignment.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to view submissions for this assignment" });
    }

    const submissions = await AssignmentSubmission.find({ assignment: id })
      .populate("student", "name rollNo profilePicture")
      .sort({ createdAt: -1 });

    res.status(200).json(submissions);
  } catch (err) {
    console.error("Error fetching submissions:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
export const getAssignmentsBySubject = async (req, res) => {
  try {
    const { subjectId } = req.params;

    // ✅ Verify subject exists
    const subject = await Subject.findById(subjectId).select("name");
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    // ✅ Fetch assignments for this subject
    const assignments = await Assignment.find({ subject: subjectId })
      .populate("createdBy", "name email") // Teacher/Dept Admin who created
      .select("title description fileUrl marks deadline createdAt");

    res.status(200).json({
      subjectId,
      subjectName: subject.name,
      assignments,
    });
  } catch (err) {
    console.error("Get Assignments by Subject Error:", err);
    res.status(500).json({
      message: "Error fetching assignments for subject",
      error: err.message,
    });
  }
};

export const getAssignmentsWithSubmissions = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const studentId = req.user._id;

    const subject = await Subject.findById(subjectId).select("name");
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    const assignments = await Assignment.find({ subject: subjectId })
      .populate("createdBy", "name email")
      .select("title description fileUrl marks deadline createdAt");

    const submissions = await AssignmentSubmission.find({
      assignment: { $in: assignments.map((a) => a._id) },
      student: studentId,
    }).select("assignment fileUrl status obtainedMarks createdAt");

    const submissionMap = {};
    submissions.forEach((sub) => {
      submissionMap[sub.assignment.toString()] = sub;
    });

    const pending = [];
    const submitted = [];

    assignments.forEach((assign) => {
      const merged = {
        _id: assign._id,
        title: assign.title,
        description: assign.description,
        fileUrl: assign.fileUrl,
        marks: assign.marks,
        deadline: assign.deadline,
        createdBy: assign.createdBy,
        createdAt: assign.createdAt,
        submission: submissionMap[assign._id.toString()] || null,
      };

      if (merged.submission) {
        submitted.push(merged);
      } else {
        pending.push(merged);
      }
    });

    res.status(200).json({
      subjectId,
      subjectName: subject.name,
      studentId,
      pending,
      submitted,
    });
  } catch (err) {
    console.error("Get Assignments With Submissions Error:", err);
    res.status(500).json({
      message: "Error fetching assignments with submissions",
      error: err.message,
    });
  }
};

export const updateSubmission = async (req, res) => {
  try {
    const { assignmentId, submissionId } = req.params;
    const { obtainedMarks, status } = req.body;

    // ensure assignment exists
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // ensure submission exists
    const submission = await AssignmentSubmission.findOne({
      _id: submissionId,
      assignment: assignmentId,
    }).populate("student", "name rollNo");

    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    // update fields
    if (obtainedMarks !== undefined) {
      if (obtainedMarks > assignment.marks) {
        return res.status(400).json({
          message: `Marks cannot exceed maximum (${assignment.marks})`,
        });
      }
      submission.obtainedMarks = obtainedMarks;
      submission.status = "graded";
    }

    if (status) {
      submission.status = status;
    }

    await submission.save();

    res.status(200).json({
      message: "Submission updated successfully",
      submission,
    });
  } catch (err) {
    console.error("Update Submission Error:", err);
    res.status(500).json({
      message: "Error updating submission",
      error: err.message,
    });
  }
};

