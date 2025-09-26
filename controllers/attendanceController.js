// controllers/attendanceController.js
import mongoose from "mongoose";
import Attendance from "../models/Attendance.js";
import Subject from "../models/Subject.js";
import User from "../models/User.js";

const toObjectId = (id) => {
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return null;
  }
};

// ----------------- MARK ATTENDANCE -----------------
export const markAttendance = async (req, res) => {
  try {
    const { records } = req.body;

    if (!["Teacher", "DepartmentAdmin"].includes(req.user.role))
      return res.status(403).json({ message: "Not authorized" });

    if (!Array.isArray(records) || !records.length)
      return res.status(400).json({ message: "records array is required" });

    const ops = [];

    for (const r of records) {
      const studentId = toObjectId(r.student);
      const subjectId = toObjectId(r.subject);
      const attDate = r.date ? new Date(r.date) : null;

      if (!studentId || !subjectId || !attDate) continue;

      const student = await User.findById(studentId);
      if (!student) continue;

      const subjectDoc = await Subject.findById(subjectId);
      if (!subjectDoc) continue;

      // If Teacher, ensure they teach this subject
      if (req.user.role === "Teacher" && subjectDoc.teacher?.toString() !== req.user._id.toString()) {
        continue; // skip unauthorized subjects
      }

      const status = (r.status || "").toLowerCase() === "present" ? "present" : "absent";

      // Set day range for uniqueness (prevent duplicate attendance per day)
      const start = new Date(attDate); start.setHours(0,0,0,0);
      const end = new Date(attDate); end.setHours(23,59,59,999);

      ops.push({
        updateOne: {
          filter: { student: studentId, subject: subjectId, date: { $gte: start, $lte: end } },
          update: { student: studentId, subject: subjectId, date: attDate, status, markedBy: req.user._id },
          upsert: true,
        },
      });
    }

    if (!ops.length) return res.status(400).json({ message: "No valid student records to mark" });

    await Attendance.bulkWrite(ops);

    res.status(201).json({ message: "Attendance marked successfully" });
  } catch (err) {
    console.error("markAttendance Error:", err);
    res.status(500).json({ message: "Error marking attendance", error: err.message });
  }
};


// ----------------- GET ATTENDANCE -----------------
export const getAttendance = async (req, res) => {
  try {
    const { studentId, subject, date } = req.query;
    const filter = {};

    // Filter by studentId if provided
    if (studentId) filter.student = toObjectId(studentId);

    // Filter by date if provided
    if (date) {
      const d = new Date(date);
      filter.date = { $gte: new Date(d.setHours(0, 0, 0, 0)), $lte: new Date(d.setHours(23, 59, 59, 999)) };
    }

    // Filter by subject if provided
    let subjectId;
    if (subject) {
      subjectId = toObjectId(subject);
      const subjectDoc = await Subject.findById(subjectId);
      if (!subjectDoc) return res.status(404).json({ message: "Subject not found" });
      filter.subject = subjectId;
    }
    // If teacher, only allow subjects they teach
    if (req.user.role === "Teacher") {
      const teacherSubjects = await Subject.find({ teacher: req.user._id }).select("_id");
      const allowedSubjectIds = teacherSubjects.map((s) => s._id.toString());

      if (subjectId && !allowedSubjectIds.includes(subjectId.toString())) {
        return res.status(403).json({ message: "Cannot view attendance for this subject" });
      }

      if (!subjectId) {
        filter.subject = { $in: allowedSubjectIds.map((id) => toObjectId(id)) };
      }
    }

    // Student can only view their own attendance
    if (req.user.role === "Student") {
      filter.student = req.user._id;
    }

    const attendance = await Attendance.find(filter)
      .populate("subject", "name code")
      .populate("student", "name rollNo");

    if (!attendance.length) return res.status(404).json({ message: "No attendance found" });

    res.status(200).json(attendance);
  } catch (err) {
    console.error("getAttendance Error:", err);
    res.status(500).json({ message: "Error fetching attendance", error: err.message });
  }
};

// ----------------- GET ATTENDANCE BY STUDENT -----------------
export const getAttendanceByStudentId = async (req, res) => {
  try {
    const studentId = req.user._id; // ✅ student is auto from middleware
    const { subjectId } = req.query; // ✅ subject comes from frontend params

    // validate subjectId
    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      return res.status(400).json({ message: "Invalid subject ID" });
    }

    // fetch attendance for this student + subject
    const records = await Attendance.find({
      student: studentId,
      subject: subjectId,
    })
      .populate("subject", "name code")
      .populate("student", "name rollNo");

    const total = records.length;
    const presentCount = records.filter((r) => r.status === "present").length;
    const percentage = total ? ((presentCount / total) * 100).toFixed(2) : 0;

    res.status(200).json({ records, percentage });
  } catch (err) {
    console.error("getAttendanceByStudentId Error:", err);
    res
      .status(500)
      .json({ message: "Error fetching attendance", error: err.message });
  }
};

// ----------------- UPDATE ATTENDANCE -----------------
export const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate attendance ID
    if (!id) return res.status(400).json({ message: "Attendance ID is required" });

    const attendance = await Attendance.findById(id);
    if (!attendance) return res.status(404).json({ message: "Attendance not found" });

    // Only the teacher who marked it or admins can update
    if (req.user.role === "Teacher" && attendance.markedBy.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Cannot update this attendance" });

    // Validate status
    if (status) {
      const normalizedStatus = status.toLowerCase();
      if (!["present", "absent"].includes(normalizedStatus)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      attendance.status = normalizedStatus;
    } else {
      return res.status(400).json({ message: "Status is required" });
    }

    await attendance.save();

    res.status(200).json({
      message: "Attendance updated successfully",
      attendance,
    });
  } catch (err) {
    console.error("updateAttendance Error:", err);
    res.status(500).json({ message: "Error updating attendance", error: err.message });
  }
};


// ----------------- DELETE ATTENDANCE -----------------
export const deleteAttendance = async (req, res) => {
  try {
    const { course, subject, date } = req.query;

    if (!subject || !date) {
      return res.status(400).json({ message: "Subject and date are required" });
    }

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const filter = {
      subject: toObjectId(subject),
      date: { $gte: start, $lte: end },
    };

    // Only teachers who marked attendance or admins can delete
    if (req.user.role === "Teacher") {
      filter.markedBy = req.user._id;
    }

    const result = await Attendance.deleteMany(filter);

    if (!result.deletedCount) {
      return res.status(404).json({ message: "No attendance records found to delete" });
    }

    res.status(200).json({ message: `${result.deletedCount} attendance records deleted successfully` });
  } catch (err) {
    console.error("deleteAttendance Error:", err);
    res.status(500).json({ message: "Error deleting attendance", error: err.message });
  }
};

export const getOverallAttendance = async (req, res) => {
  try {
    const studentId = req.user._id;
    const batchId = req.user.batch;
    const currentSemester = req.user.semester;

    // ✅ Get all subjects of student's current semester
    const subjects = await Subject.find({
      batch: batchId,
      semester: currentSemester,
    }).select("_id");

    const subjectIds = subjects.map((s) => s._id);

    if (subjectIds.length === 0) {
      return res.json({
        percentage: 0,
        total: 0,
        present: 0,
        absent: 0,
        semester: currentSemester,
      });
    }

    // ✅ Fetch only current semester attendance records
    const records = await Attendance.find({
      student: studentId,
      subject: { $in: subjectIds },
    });

    if (records.length === 0) {
      return res.json({
        percentage: 0,
        total: 0,
        present: 0,
        absent: 0,
        semester: currentSemester,
      });
    }

    // ✅ Count total, present, and absent
    const total = records.length;
    const present = records.filter((r) => r.status === "present").length;
    const absent = total - present;

    // ✅ Calculate percentage (rounded to 1 decimal place)
    const percentage = Number(((present / total) * 100).toFixed(1));

    res.json({
      percentage,
      total,
      present,
      absent,
      semester: currentSemester,
    });
  } catch (err) {
    console.error("Error calculating overall attendance:", err);
    res.status(500).json({ message: "Failed to fetch overall attendance" });
  }
};

