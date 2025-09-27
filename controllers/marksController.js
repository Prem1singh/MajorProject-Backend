// controllers/marksController.js
import mongoose from "mongoose";
import Marks from "../models/Marks.js";
import User from "../models/User.js";
import  toObjectId  from "../util/toObjectId.js";
import Exam from "../models/Exam.js";
import Batch from "../models/Batch.js";
import Subject from "../models/Subject.js";

// ----------------- ADD MARKS -----------------
export const addMarks = async (req, res) => {
  try {
    const { role, _id: addedBy } = req.user;

    if (!["Teacher", "DepartmentAdmin"].includes(role))
      return res.status(403).json({ message: "Only teachers or DepartmentAdmins can add marks" });

    const { records } = req.body;
    if (!Array.isArray(records) || !records.length)
      return res.status(400).json({ message: "records array is required" });

    const bulkOps = [];

    for (const rec of records) {
      if (!rec.student || !rec.subject || !rec.exam || rec.obtained == null || rec.total == null)
        continue;

      let studentId, subjectId, examId;
      try {
        studentId = new mongoose.Types.ObjectId(rec.student);
        subjectId = new mongoose.Types.ObjectId(rec.subject);
        examId = new mongoose.Types.ObjectId(rec.exam);
      } catch {
        continue; // skip invalid IDs
      }

      const obtained = Number(rec.obtained);
      const total = Number(rec.total);
      if (isNaN(obtained) || isNaN(total) || obtained < 0 || obtained > total) continue;

      bulkOps.push({
        updateOne: {
          filter: { student: studentId, subject: subjectId, exam: examId },
          update: { $set: { obtained, total, addedBy } }, // set addedBy from req.user
          upsert: true,
        },
      });
    }

    if (!bulkOps.length) return res.status(400).json({ message: "No valid records to add/update" });

    const result = await Marks.bulkWrite(bulkOps);
    res.status(201).json({ message: "Marks added/updated successfully", result });

  } catch (err) {
    console.error("Add Marks Error:", err);
    res.status(500).json({ message: "Error adding marks", error: err.message });
  }
};

// ----------------- GET MARKS BY STUDENT -----------------
export const getStudentMarks = async (req, res) => {
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
      return res.status(200).json([]);
    }

    // ✅ Fetch only marks of current semester subjects
    const marks = await Marks.find({
      student: studentId,
      subject: { $in: subjectIds },
    })
      .populate("subject", "name code")
      .populate("exam", "name totalMarks type")
      .sort({ createdAt: 1 });
    res.status(200).json(marks);
  } catch (err) {
    console.error("getStudentMarks Error:", err);
    res
      .status(500)
      .json({ message: "Error fetching marks", error: err.message });
  }
};

// ----------------- GET MARKS BY SUBJECT & EXAM -----------------
export const getMarks = async (req, res) => {
  try {
    const { subject } = req.query;
    if (!subject) return res.status(400).json({ message: "subject is required" });

    const subjectId = toObjectId(subject);

    // 1️⃣ Find all exams for this subject (based on batch of the subject)
    const exams = await Exam.find({ })
      .lean();

    if (!exams.length) return res.status(404).json({ message: "No exams found for this subject" });

    // 2️⃣ Fetch all marks for this subject for all exams
    const marks = await Marks.find({ subject: subjectId })
      .populate("user", "name rollNo")
      .lean();

    // 3️⃣ Transform data to show marks per student grouped by exam type
    const studentsMap = {};

    marks.forEach((m) => {
      const sid = m.student._id.toString();
      if (!studentsMap[sid]) {
        studentsMap[sid] = { student: m.student };
      }

      const examName = exams.find((ex) => ex._id.toString() === m.exam.toString())?.name || "Unknown";
      studentsMap[sid][examName.toLowerCase().replace(/\s+/g, "")] = m.obtained;
    });

    const studentsData = Object.values(studentsMap);

    res.status(200).json(studentsData);

  } catch (err) {
    console.error("Get Marks Error:", err);
    res.status(500).json({ message: "Error fetching marks", error: err.message });
  }
};


export const getMarksForExam = async (req, res) => {
  try {
    const { subject, exam } = req.query;

    if (!subject || !exam) {
      return res.status(400).json({ message: "subject and exam are required" });
    }

    const subjectId = toObjectId(subject);
    const examId = toObjectId(exam);

    // 1️⃣ Find exam and its batch
    const examDoc = await Exam.findById(examId).lean();
    if (!examDoc) {
      return res.status(404).json({ message: "Exam not found" });
    }

    const batchId = examDoc.batch;

    // 2️⃣ Fetch all students in that batch
    const students = await User.find({ batch: batchId, role: "Student" })
      .select("name rollNo")
      .lean();

    if (!students.length) {
      return res.status(404).json({ message: "No students found for this batch" });
    }

    // 3️⃣ Fetch marks for this subject + exam
    const marks = await Marks.find({ subject: subjectId, exam: examId }).lean();

    // 4️⃣ Map marks to students
    const studentRecords = students.map((s) => {
      const markRecord = marks.find((m) => m.student.toString() === s._id.toString());
      return {
        _id: s._id,
        name: s.name,
        rollNo: s.rollNo || s.profile?.rollNo,
        profile: s.profile,
        obtained: markRecord?.obtained ?? null,
        total: markRecord?.total ?? examDoc.totalMarks ?? 100,
      };
    });

    res.status(200).json({
      exam: { _id: examDoc._id, name: examDoc.name, totalMarks: examDoc.totalMarks },
      students: studentRecords,
    });
  } catch (err) {
    console.error("getMarksForExam error:", err);
    res.status(500).json({ message: "Error fetching marks", error: err.message });
  }
};
// ----------------- UPDATE MARKS -----------------
// ----------------- UPDATE BULK MARKS -----------------
export const updateBulkMarks = async (req, res) => {
  try {
    const { role, _id: addedBy } = req.user;
    if (!["Teacher", "DepartmentAdmin"].includes(role))
      return res.status(403).json({ message: "Only teachers or DepartmentAdmins can update marks" });

    const { subject, exam, records } = req.body;
    if (!subject || !exam || !Array.isArray(records) || !records.length)
      return res.status(400).json({ message: "subject, exam, and non-empty records are required" });

    const bulkOps = [];
    for (const rec of records) {
      if (!rec.studentId || rec.obtained == null || rec.total == null) continue;

      const studentId = mongoose.Types.ObjectId(rec.studentId);
      const total = Number(rec.total);
      const obtained = Number(rec.obtained);

      if (isNaN(total) || isNaN(obtained) || obtained < 0 || obtained > total) {
        return res.status(400).json({
          message: `Invalid marks for student ${rec.studentId}. Obtained must be between 0 and total.`,
        });
      }

      bulkOps.push({
        updateOne: {
          filter: { student: studentId, subject, exam },
          update: { $set: { obtained, total, addedBy } },
          upsert: true, // create if doesn't exist
        },
      });
    }

    if (!bulkOps.length) return res.status(400).json({ message: "No valid records to update" });

    const result = await Marks.bulkWrite(bulkOps);
    res.status(200).json({ message: "Marks updated successfully", result });

  } catch (err) {
    console.error("Update Bulk Marks Error:", err);
    res.status(500).json({ message: "Error updating marks", error: err.message });
  }
};

export const updateMarks = async (req, res) => {
  try {
    const { role, _id: addedBy } = req.user;
    if (!["Teacher", "DepartmentAdmin"].includes(role))
      return res.status(403).json({ message: "Only teachers or DepartmentAdmins can update marks" });

    const { id } = req.params; // Marks document ID
    const { obtained, total } = req.body;

    const marks = await Marks.findById(id);
    if (!marks) return res.status(404).json({ message: "Marks record not found" });

    if (obtained != null) marks.obtained = obtained;
    if (total != null) marks.total = total;
    marks.addedBy = addedBy;

    await marks.save();
    res.status(200).json({ message: "Marks updated successfully", marks });

  } catch (err) {
    console.error("Update Marks Error:", err);
    res.status(500).json({ message: "Error updating marks", error: err.message });
  }
};

// ----------------- DELETE MARKS -----------------
// export const deleteMarks = async (req, res) => {
//   try {
//     const { role } = req.user;
//     if (!["Teacher", "DepartmentAdmin"].includes(role))
//       return res.status(403).json({ message: "Only teachers or DepartmentAdmins can delete marks" });

//     const { id } = req.params; // Marks document ID
//     const marks = await Marks.findByIdAndDelete(id);
//     if (!marks) return res.status(404).json({ message: "Marks record not found" });

//     res.status(200).json({ message: "Marks deleted successfully" });

//   } catch (err) {
//     console.error("Delete Marks Error:", err);
//     res.status(500).json({ message: "Error deleting marks", error: err.message });
//   }
// };

export const deleteMarks = async (req, res) => {
  try {
    const { subject, exam } = req.query;

    if (!subject || !exam) {
      return res.status(400).json({ message: "subject and exam are required" });
    }

    const subjectId = toObjectId(subject);
    const examId = toObjectId(exam);

    // Delete all marks for this subject + exam
    const result = await Marks.deleteMany({ subject: subjectId, exam: examId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "No marks found to delete" });
    }

    res.status(200).json({
      message: "Marks deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error("deleteMarks error:", err);
    res.status(500).json({ message: "Error deleting marks", error: err.message });
  }
};
