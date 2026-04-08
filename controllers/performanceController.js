import Marks from "../models/Marks.js";


// 1️⃣ Student → own performance
import User from "../models/User.js";

export const getStudentPerformance = async (req, res) => {
  try {
    const studentId = req.user._id;

    // 1️⃣ Student ki batch detail nikaalo comparison ke liye
    const studentProfile = await User.findById(studentId).select("batch").lean();
    if (!studentProfile) return res.status(404).json({ message: "Student not found" });
    const batchId = studentProfile.batch;

    // 2️⃣ Student ke saare marks fetch karo (Subject and Exam detail ke saath)
    const marks = await Marks.find({ student: studentId })
      .populate("subject", "name")
      .populate("exam", "name totalMarks")
      .lean();
      
    if (!marks.length) return res.json({ marksTrend: [], batchComparison: [] });

    // 3️⃣ marksTrend: Har subject ka obtained aur uska total marks
    const marksTrend = marks.map(m => ({
      exam: m.exam.name,
      subject: m.subject.name,
      obtained: m.obtained,
      totalMarks: m.exam.totalMarks || 100, // Agar schema mein totalMarks hai toh wahi use hoga
      examId: m.exam._id
    }));

    // 4️⃣ Batch Comparison Logic
    const examIds = marks.map(m => m.exam._id);
    
    // Batch ke baaki sabhi bacho ke marks fetch karo inhi exams ke liye
    const allBatchMarks = await Marks.find({ exam: { $in: examIds } })
      .populate("student", "batch")
      .lean();

    // Sirf usi batch ke bacho ka data filter karo
    const filteredBatchMarks = allBatchMarks.filter(
      m => m.student && String(m.student.batch) === String(batchId)
    );

    // Har subject/exam ke liye Batch ka total data taiyar karo
    const batchComparison = marksTrend.map((myRecord) => {
      // Is specific exam ke liye batch ke sabhi bacho ke marks
      const subjectBatchMarks = filteredBatchMarks.filter(
        m => String(m.exam) === String(myRecord.examId) && 
             String(m.subject) === String(marks.find(x => x.subject.name === myRecord.subject).subject._id)
      );

      let batchObtainedSum = 0;
      subjectBatchMarks.forEach(m => batchObtainedSum += m.obtained);

      return {
        exam: myRecord.exam,
        subject: myRecord.subject,
        myObtained: myRecord.obtained,
        myTotal: myRecord.totalMarks,
        batchAvgObtained: subjectBatchMarks.length > 0 
          ? (batchObtainedSum / subjectBatchMarks.length).toFixed(1) 
          : 0
      };
    });
    console.log(marksTrend)
    res.json({ marksTrend, batchComparison });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


// 2️⃣ Teacher → batch performance
export const getBatchPerformance = async (req, res) => {
  try {
    const batchId = req.params.batchId;
    const marks = await Marks.find({ batch: batchId })
      .populate("student", "name")
      .populate("subject", "name")
      .populate("exam", "name")
      .lean();

    const performance = {};
    marks.forEach(m => {
      if (!performance[m.student.name]) performance[m.student.name] = {};
      if (!performance[m.student.name][m.subject.name]) performance[m.student.name][m.subject.name] = {};
      performance[m.student.name][m.subject.name][m.exam.name] = m.obtained;
    });

    res.json(performance);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// 3️⃣ Teacher → subject performance
export const getSubjectPerformance = async (req, res) => {
  try {
    const subjectId = req.params.subjectId;
   
    // Fetch marks for this subject
    const marks = await Marks.find({ subject: subjectId })
      .populate("student", "name")
      .populate("exam", "name")
      .lean();

    if (!marks.length) return res.json({ exams: [], students: [], trend: [] });
    // Get list of exams in order
    const examsSet = new Set();
    marks.forEach(m => examsSet.add(m.exam.name));
    const exams = Array.from(examsSet);

    // Build students array
    const studentsMap = {};
    marks.forEach(m => {
      const studentId = m.student?._id.toString();
      if (!studentsMap[studentId]) {
        studentsMap[studentId] = { studentId, name: m.student?.name, marks: {} };
      }
      studentsMap[studentId].marks[m.exam.name] = m.obtained;
    });
    const students = Object.values(studentsMap);

    // Compute trend (average per exam)
    const trend = exams.map(exam => {
      const total = students.reduce((sum, s) => sum + (s.marks[exam] || 0), 0);
      const avg = total / students.length;
      return { exam, average: parseFloat(avg.toFixed(2)) };
    });

    res.json({ exams, students, trend });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// 4️⃣ Department → batch-level performance (with optional subject filter)

export const getDepartmentBatchPerformance = async (req, res) => {
  try {
    const { subject, batch } = req.query;
    const department = req.user.department; // department of the logged-in DepartmentAdmin

    if (!batch) return res.status(400).json({ message: "Batch is required" });

    // 1️⃣ Get students in this department and batch
    const students = await User.find({ role: "Student", batch, department })
      .select("_id")
      .lean();
    const studentIds = students.map(s => s._id);

    // 2️⃣ Query marks for these students (and subject if provided)
    const query = { student: { $in: studentIds } };
    if (subject) query.subject = subject;

    const marks = await Marks.find(query)
      .populate("student", "name")
      .populate("subject", "name")
      .populate("exam", "name")
      .lean();

    if (!marks.length) return res.json({ subjects: [], exams: [], trend: [] });

    // 3️⃣ Collect all exams
    const examsSet = new Set();
    marks.forEach(m => examsSet.add(m.exam.name));
    const exams = Array.from(examsSet);

    // 4️⃣ Collect subjects with marks per exam
    const subjectsMap = {};
    marks.forEach(m => {
      const subjName = m.subject.name;
      if (!subjectsMap[subjName]) subjectsMap[subjName] = {};
      subjectsMap[subjName][m.exam.name] = m.obtained;
    });

    // 5️⃣ Build subjects array with average
    const subjectsArr = Object.entries(subjectsMap).map(([subj, marksObj]) => {
      const total = Object.values(marksObj).reduce((a, b) => a + b, 0);
      const average = (total / exams.length).toFixed(2);
      return { subject: subj, marks: marksObj, average };
    });

    // 6️⃣ Build trend array (average per exam across all subjects)
    const trend = exams.map(exam => {
      let total = 0, count = 0;
      marks.forEach(m => {
        if (m.exam.name === exam) {
          total += m.obtained;
          count++;
        }
      });
      return { exam, average: count ? +(total / count).toFixed(2) : 0 };
    });

    res.json({ subjects: subjectsArr, exams, trend });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// 5️⃣ Department → department-wide performance (aggregate)
export const getDepartmentPerformance = async (req, res) => {
  try {
    const { batch, subject } = req.query;

    const query = {};
    if (batch) query.batch = batch;
    if (subject) query.subject = subject;

    const marks = await Marks.find(query)
      .populate("student", "name")
      .populate("subject", "name")
      .populate("exam", "name")
      .lean();

    const performance = {};
    marks.forEach(m => {
      const studentName = m.student.name;
      const subjectName = m.subject.name;
      if (!performance[studentName]) performance[studentName] = {};
      if (!performance[studentName][subjectName]) performance[studentName][subjectName] = {};
      performance[studentName][subjectName][m.exam.name] = m.obtained;
    });

    res.json(performance);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
