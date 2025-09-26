import Subject from "../models/Subject.js";
import User from "../models/User.js";
import Exam from "../models/Exam.js";
import Course from "../models/Courses.js"
import Assignment from "../models/Assignment.js"
import AssignmentSubmission from "../models/AssignmentSubmission.js"
import Attendance from "../models/Attendance.js"
import mongoose from "mongoose";
import toObjectId from "../util/toObjectId.js";

const id = "65123abc..."; 
const objId = toObjectId(id);

if (!objId) {

}

export const getMySubjects = async (req, res) => {
  try {
    const teacherId = req.user._id; // ✅ logged in teacher

    // find subjects where this teacher is assigned
    const subjects = await Subject.find({ teacher: teacherId })
      .populate("batch", "name year currentSem") // ✅ include currentSem
      .select("name code semester credits type batch")
      .lean();

    // ✅ Only include subjects where semester matches batch.currentSem
    const currentSemSubjects = subjects.filter(
      (s) => s.batch && s.semester === s.batch.currentSem
    );

    if (!currentSemSubjects.length) {
      return res.status(404).json({ message: "No current semester subjects assigned to you" });
    }

    res.status(200).json({
      teacherId,
      subjects: currentSemSubjects,
    });
  } catch (err) {
    console.error("Error fetching teacher subjects:", err);
    res.status(500).json({ message: "Server error" });
  }
};


export const getStudentsForSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id).populate("batch");
    if (!subject) return res.status(404).json({ message: "Subject not found" });

    const students = await User.find({ batch: subject.batch._id, role: "Student" }).select("name rollNo");
    res.status(200).json({ students });
  } catch (err) {
    console.error("Error fetching students for subject:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
export const getExamsForSubject = async (req, res) => {
  try {
    const { subject } = req.query;
    if (!subject) return res.status(400).json({ message: "Subject ID is required" });

    const subjectId = toObjectId(subject);
    if (!subjectId) return res.status(400).json({ message: "Invalid subject ID" });

    const subjectDoc = await Subject.findById(subjectId);
    if (!subjectDoc) return res.status(404).json({ message: "Subject not found" });

    const batchId = subjectDoc.batch;
    if (!batchId) return res.status(400).json({ message: "Subject does not have a batch assigned" });

    const exams = await Exam.find({ batch: batchId }).sort({ createdAt: -1 });
    if (!exams.length) return res.status(404).json({ message: "No exams found for this batch" });

    res.status(200).json(exams);
  } catch (err) {
    console.error("getExamsForSubject Error:", err);
    res.status(500).json({ message: "Error fetching exams", error: err.message });
  }
};

export const getStudentsAndExamsForSubject = async (req, res) => {
  try {
    const { subject } = req.params;
    if (!subject) return res.status(400).json({ message: "Subject ID is required" });

    // 1️⃣ Find the subject
    const subj = await Subject.findById(subject).populate("batch");
    if (!subj) return res.status(404).json({ message: "Subject not found" });

    // 2️⃣ Fetch batch
    const batchId = subj.batch?._id;
    if (!batchId) return res.status(404).json({ message: "Batch not associated with this subject" });

    // 3️⃣ Fetch exams for this batch
    const exams = await Exam.find({ batch: batchId }).sort({ createdAt: 1 });

    // 4️⃣ Fetch students assigned to this subject (or in batch)
    const students = await User.find({
      role: "Student",
      "course": subj.course, // optional: match course if needed
      "batch": batchId,
    }).select("_id name profile");

    // 5️⃣ Optional: include existing marks
    // marksMap: studentId -> array of marks for this subject's exams
    // You can populate if needed.

    res.status(200).json({
      students,
      exams,
    });
  } catch (err) {
    console.error("getStudentsAndExamsForSubject Error:", err);
    res.status(500).json({ message: "Error fetching students and exams", error: err.message });
  }
};

export const getTeacherOverview = async (req, res) => {
  try {
    const teacherId = req.user._id;

    // 1️⃣ Subjects handled by teacher (populate batch to get currentSem)
    const subjects = await Subject.find({ teacher: teacherId })
      .populate("batch", "name currentSem")
      .select("_id name batch semester")
      .lean();

    // ✅ Only include subjects that belong to the batch's currentSem
    const currentSemSubjects = subjects.filter(
      (s) => s.batch && s.semester === s.batch.currentSem
    );

    // 2️⃣ Students per subject (match with batch & currentSem)
    const studentsPerSubject = await Promise.all(
      currentSemSubjects.map(async (subj) => {
        const count = await User.countDocuments({
          role: "Student",
          batch: subj.batch._id,
          semester: subj.batch.currentSem,
        });
        return {
          subject: subj.name,
          semester: subj.batch.currentSem,
          students: count,
        };
      })
    );

    const totalStudents = studentsPerSubject.reduce(
      (acc, s) => acc + s.students,
      0
    );

    // 3️⃣ Assignments restricted to current sem subjects
    const assignments = await Assignment.find({
      createdBy: teacherId,
      subject: { $in: currentSemSubjects.map((s) => s._id) },
    }).lean();

    const assignmentIds = assignments.map((a) => a._id);

    const submissions = await AssignmentSubmission.find({
      assignment: { $in: assignmentIds },
    });

    const submittedCount = submissions.length;

    // 4️⃣ Attendance for today (restricted to current sem subjects)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const subjectIds = currentSemSubjects.map((s) => s._id);

    const attendanceRecords = await Attendance.find({
      subject: { $in: subjectIds },
      date: { $gte: today, $lt: tomorrow },
    }).populate("student", "name rollNo");

    let attendancePresent = 0;
    let attendanceAbsent = 0;

    attendanceRecords.forEach((r) => {
      if (r.status) {
        const status = r.status.toLowerCase();
        if (status === "present" || status === "p") attendancePresent++;
        else if (status === "absent" || status === "a") attendanceAbsent++;
      }
    });

    const attendanceData = [
      { status: "Present", value: attendancePresent },
      { status: "Absent", value: attendanceAbsent },
    ];

    // 5️⃣ Recent assignments
    const recentAssignments = assignments
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    // 6️⃣ Upcoming exams (filter by batch + currentSem)
    const batchIds = currentSemSubjects.map((s) => s.batch._id);
    const sems = currentSemSubjects.map((s) => s.batch.currentSem);

    const upcomingExams = await Exam.find({
      batch: { $in: batchIds },
      semester: { $in: sems },
      examDate: { $gte: today },
    })
      .sort("examDate")
      .lean();

    // 7️⃣ Assignment trend (last 7 days, current sem)
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 6);

    const assignmentsTrend = await AssignmentSubmission.aggregate([
      {
        $match: {
          assignment: { $in: assignmentIds },
          createdAt: { $gte: last7Days },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          submissions: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // ✅ Response
    res.status(200).json({
      overview: {
        subjects: currentSemSubjects.length,
        totalStudents,
        assignments: assignments.length,
        submittedAssignments: submittedCount,
        attendancePresent,
        attendanceAbsent,
        attendanceTotal: attendanceRecords.length,
        recentAssignments,
      },
      studentsPerSubject,
      attendanceData,
      assignmentsTrend,
      upcomingExams,
    });
  } catch (err) {
    console.error("❌ Teacher overview error:", err);
    res.status(500).json({
      message: "Error fetching teacher overview",
      error: err.message,
    });
  }
};


