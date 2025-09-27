import mongoose from "mongoose";
import Attendance from "../models/Attendance.js";
import Marks from "../models/Marks.js";
import Assignment from "../models/Assignment.js";
import AssignmentSubmission from "../models/AssignmentSubmission.js";
import Exam from "../models/Exam.js";
import Subject from "../models/Subject.js";

export const getStudentOverview = async (req, res) => {
  try {
    const studentId = req.user._id;
    const batchId = req.user.batch;
    const currentSemester = req.user.semester; // ✅ current semester from student

    // 1️⃣ Subjects enrolled (via batch & semester)
    const subjects = await Subject.find({
      batch: batchId,
      semester: currentSemester,
    })
      .select("name code")
      .lean();

    const subjectIds = subjects.map((s) => s._id);

    // 2️⃣ Attendance (only for current semester subjects)
    const attendanceRecords = await Attendance.find({
      student: studentId,
      subject: { $in: subjectIds },
    })
      .populate("subject", "name")
      .lean();

    const totalAttendance = attendanceRecords.length;
    const presentCount = attendanceRecords.filter(
      (r) => r.status === "present"
    ).length;

    const attendanceData = [
      { status: "Present", value: presentCount },
      { status: "Absent", value: totalAttendance - presentCount },
    ];

    // 3️⃣ Assignments & Submissions (only current sem subjects)
    const allAssignments = await Assignment.find({
      subject: { $in: subjectIds },
    }).lean();

    const submittedAssignmentsData = await AssignmentSubmission.find({
      student: studentId,
      assignment: { $in: allAssignments.map((a) => a._id) },
    }).lean();

    const submittedAssignments = submittedAssignmentsData.length;
    const pendingAssignments = allAssignments.length - submittedAssignments;

    // ✅ Build assignment trend (aggregate per date)
    const trendMap = {};
    allAssignments.forEach((a) => {
      const date = a.createdAt.toISOString().split("T")[0];
      if (!trendMap[date]) {
        trendMap[date] = { date, total: 0, submitted: 0, pending: 0 };
      }
      trendMap[date].total++;
      const isSubmitted = submittedAssignmentsData.some(
        (s) => s.assignment.toString() === a._id.toString()
      );
      if (isSubmitted) {
        trendMap[date].submitted++;
      } else {
        trendMap[date].pending++;
      }
    });

    const assignmentsTrend = Object.values(trendMap).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    // 4️⃣ Marks Trend (only current sem subjects)
    const marksRecords = await Marks.find({
      student: studentId,
      subject: { $in: subjectIds },
    })
      .populate("exam", "name")
      .lean();

    const marksTrend = marksRecords.map((m) => ({
      exam: m.exam?.name || "N/A",
      marks: m.obtained,
    }));

    // 5️⃣ Upcoming Exams (only for current semester & batch)
    const now = new Date();
    const upcomingExams = await Exam.find({
      batch: batchId,
      semester: currentSemester,
      date: { $gte: now },
    })
      .sort("date")
      .lean();

    // 6️⃣ Recent Assignments (limit to current semester)
    const recentAssignments = allAssignments
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map((a) => ({
        _id: a._id,
        title: a.title,
        deadline: a.deadline,
      }));

    // ✅ Final response
    res.status(200).json({
      overview: {
        subjects: subjects.length,
        exams: upcomingExams.length,
        submittedAssignments,
        pendingAssignments,
        attendancePresent: presentCount,
        attendanceTotal: totalAttendance,
        currentSemester,
      },
      attendance: attendanceData,
      assignmentsTrend,
      marksTrend,
      upcomingExams,
      recentAssignments, // moved outside overview for clarity
    });
  } catch (err) {
    console.error("Student Overview Error:", err);
    res
      .status(500)
      .json({ message: "Error fetching student overview", error: err.message });
  }
};

export const getSubjectsForStudent = async (req, res) => {
  try {
    const student = req.user;
    if (student.role !== "Student") {
      return res.status(403).json({ message: "Forbidden: Access denied." });
    }

    // Assuming student has batch and semester fields
    const subjects = await Subject.find({
      batch: student.batch, // optional, if you track active/inactive subjects
    }).select("_id name code teacher"); // select fields you want to send

    res.json(subjects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
};

