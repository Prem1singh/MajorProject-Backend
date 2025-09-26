import Exam from "../models/Exam.js";
import Batch from "../models/Batch.js";
import  toObjectId  from "../util/toObjectId.js";
import Marks from "../models/Marks.js"; // assuming marks model exists



// Get exams for a batch
export const getExams = async (req, res) => {
  try {
    const { batch } = req.query;
    if (!batch) return res.status(400).json({ message: "Batch ID is required" });

    const batchId = toObjectId(batch);
    const batchExists = await Batch.findById(batchId);
    if (!batchExists) return res.status(404).json({ message: "Batch not found" });

    const exams = await Exam.find({ batch: batchId }).sort({ createdAt: -1 });
    res.status(200).json(exams);
  } catch (err) {
    console.error("getExams Error:", err);
    res.status(500).json({ message: "Error fetching exams", error: err.message });
  }
};

// Add new exam
export const addExam = async (req, res) => {
  try {
    const { batch, name, type, totalMarks, description } = req.body;
    if (!batch || !name || !type || !totalMarks)
      return res.status(400).json({ message: "Batch, name, type, and totalMarks are required" });

    const batchId = toObjectId(batch);
    const batchExists = await Batch.findById(batchId);
    if (!batchExists) return res.status(404).json({ message: "Batch not found" });

    const newExam = await Exam.create({
      batch: batchId,
      name,
      type,
      totalMarks,
      description: description || "",
      createdBy: req.user._id,
    });

    res.status(201).json(newExam);
  } catch (err) {
    console.error("addExam Error:", err);
    res.status(500).json({ message: "Error adding exam", error: err.message });
  }
};

// Delete exam
// DELETE /exams/:id → delete an exam
export const deleteExam = async (req, res) => {
  try {
    if (!["Admin", "DepartmentAdmin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Not authorized to delete exams" });
    }

    const { id } = req.params;
    const examId = toObjectId(id);
    if (!examId) return res.status(400).json({ message: "Invalid exam ID" });

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    // 🔹 Cascade: delete marks of this exam only
    await Marks.deleteMany({ exam: examId });

    // 🔹 Delete exam
    await Exam.deleteOne({ _id: examId });

    res.status(200).json({
      message: "Exam and its marks deleted successfully",
    });
  } catch (err) {
    console.error("deleteExam Error:", err);
    res.status(500).json({
      message: "Error deleting exam",
      error: err.message,
    });
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


// PUT /exams/:id → update an exam
// export const updateExam = async (req, res) => {
//     try {
//       if (!["Admin", "DepartmentAdmin"].includes(req.user.role))
//         return res.status(403).json({ message: "Not authorized to update exams" });
  
//       const { id } = req.params;
//       const { name, type, totalMarks, description } = req.body;
  
//       const examId = toObjectId(id);
//       if (!examId) return res.status(400).json({ message: "Invalid exam ID" });
  
//       const exam = await Exam.findById(examId);
//       if (!exam) return res.status(404).json({ message: "Exam not found" });
  
//       if (name) exam.name = name;
//       if (type) exam.type = type;
//       if (totalMarks !== undefined) exam.totalMarks = totalMarks;
//       if (description !== undefined) exam.description = description;
  
//       await exam.save();
  
//       res.status(200).json({ message: "Exam updated successfully", exam });
//     } catch (err) {
//       console.error("updateExam Error:", err);
//       res.status(500).json({ message: "Error updating exam", error: err.message });
//     }
//   };
  