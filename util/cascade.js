// cascadeDelete.js
import Course from "../models/Courses.js";
import Batch from "../models/Batch.js";
import User from "../models/User.js";   // role-based (Teacher, Student, DeptAdmin)
import Subject from "../models/Subject.js";
import Exam from "../models/Exam.js";
import Marks from "../models/Marks.js";
import Attendance from "../models/Attendance.js";
import Assignment from "../models/Assignment.js";
import AssignmentSubmission from "../models/AssignmentSubmission.js";
import StudyMaterial from "../models/StudyMaterial.js";
import Announcement from "../models/Announcement.js";
import Doubt from "../models/Doubt.js";
import Placement from "../models/Placement.js"; // ✅ Added Placement

/**
 * 🔥 Centralized Cascade Delete Manager
 * Works hierarchically:
 * Department → Course/User → Batch → Subject → Assignment → Submission
 */

// ---------------- Department ----------------
export async function cascadeDeleteDepartment(departmentId) {
  // 1. Delete Courses
  const courses = await Course.find({ department: departmentId });
  for (let course of courses) {
    await cascadeDeleteCourse(course._id);
  }
  await Course.deleteMany({ department: departmentId });

  // 2. Delete Users of this department
  await User.deleteMany({ department: departmentId });
}

// ---------------- Course ----------------
export async function cascadeDeleteCourse(courseId) {
  // Delete Batches under this course
  const batches = await Batch.find({ course: courseId });
  for (let batch of batches) {
    await cascadeDeleteBatch(batch._id);
  }
  await Batch.deleteMany({ course: courseId });
}

// ---------------- Batch ----------------
export async function cascadeDeleteBatch(batchId) {
  // 1. Delete Subjects in this batch
  const subjects = await Subject.find({ batch: batchId });
  for (let sub of subjects) {
    await cascadeDeleteSubject(sub._id);
  }
  await Subject.deleteMany({ batch: batchId });

  // 2. Delete Batch related data
  await Exam.deleteMany({ batch: batchId });
  await Doubt.deleteMany({ batch: batchId });
  await Placement.deleteMany({ batch: batchId });

  // 3. Delete Students of this batch
  await User.deleteMany({ batch: batchId, role: "Student" });
}

// ---------------- Subject ----------------
export async function cascadeDeleteSubject(subjectId) {
  // 1. Delete Assignments & Submissions
  const assignments = await Assignment.find({ subject: subjectId });
  for (let assign of assignments) {
    await cascadeDeleteAssignment(assign._id);
  }
  await Assignment.deleteMany({ subject: subjectId });

  // 2. Delete other subject-level data
  await Marks.deleteMany({ subject: subjectId });
  await Attendance.deleteMany({ subject: subjectId });
  await StudyMaterial.deleteMany({ subject: subjectId });
  await Announcement.deleteMany({ subject: subjectId });
}

// ---------------- Assignment ----------------
export async function cascadeDeleteAssignment(assignmentId) {
  // Delete Submissions of assignment
  await AssignmentSubmission.deleteMany({ assignment: assignmentId });
}

// ---------------- Student (when explicitly deleted) ----------------
export async function cascadeDeleteStudent(studentId) {
  await Marks.deleteMany({ student: studentId });
  await Attendance.deleteMany({ student: studentId });
  await AssignmentSubmission.deleteMany({ student: studentId });
  await Doubt.deleteMany({ student: studentId });
}
