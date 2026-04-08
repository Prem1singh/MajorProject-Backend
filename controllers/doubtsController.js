import Doubt from "../models/Doubt.js";
import Batch from "../models/Batch.js";

// GET all doubts for a batch
export const getAllDoubts = async (req, res) => {
  try {
    const userBatch = await Batch.findById(req.user.batch).select("course");
    const courseId = userBatch.course;

    const doubts = await Doubt.find({ course: courseId })
      .populate({
        path: "student",
        select: "name",
        populate: { path: "batch", select: "name" } // Doubt puchne wale ka batch
      })
      .populate({
        path: "answers.user", // Answer dene wale bache ka batch
        select: "name",
        populate: { path: "batch", select: "name" } 
      })
      .sort({ createdAt: -1 })
      .lean();

    const formattedDoubts = doubts.map((doubt) => ({
      ...doubt,
      studentName: doubt.student?.name,
      batchName: doubt.student?.batch?.name,
      answers: (doubt.answers || []).map((ans) => ({
        ...ans,
        userName: ans.user?.name,
        userBatchName: ans.user?.batch?.name, // Direct User Schema se nikal raha hai
        canDelete: String(ans.user?._id) === String(req.user._id),
      })),
      canDelete: String(doubt.student?._id) === String(req.user._id),
    }));

    res.json(formattedDoubts);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// POST a new doubt



export const postDoubt = async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ message: "Question is required" });
    }

    // 1. Student info from auth middleware
    const studentId = req.user._id;
    const studentName = req.user.name;
    const batchId = req.user.batch; 

    if (!batchId) {
      return res.status(400).json({ message: "You must be assigned to a batch to post doubts." });
    }

    // 2. Fetch the batch to get the Course ID
    const batchDetails = await Batch.findById(batchId).select("course");
    
    if (!batchDetails || !batchDetails.course) {
      return res.status(404).json({ message: "Course context not found for your batch." });
    }

    const courseId = batchDetails.course;

    // 3. Save doubt with Course ID instead of Batch ID
    const newDoubt = new Doubt({ 
      student: studentId, 
      studentName, 
      course: courseId, // 👈 Now linked to Course
      question 
    });

    await newDoubt.save();

    res.status(201).json({ message: "Doubt posted to your course community successfully!" });
  } catch (err) {
    console.error("Post Doubt Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// POST answer to a doubt
export const postAnswer = async (req, res) => {
  try {
    const { doubtId } = req.params;
    const { answer } = req.body;

    if (!answer || !answer.trim())
      return res.status(400).json({ message: "Answer is required" });

    const doubt = await Doubt.findById(doubtId);
    if (!doubt) return res.status(404).json({ message: "Doubt not found" });

    // User ke batch ki details nikaalein (Naam ke liye)
    const userBatch = await Batch.findById(req.user.batch).select("course name");
    if (!userBatch) return res.status(400).json({ message: "User batch context missing" });

    // Course Match Check (Senior-Junior allowed, but same course only)
    if (String(doubt.course) !== String(userBatch.course)) {
      return res.status(403).json({ message: "You can only answer within your course community." });
    }

    // Answer push karte waqt batch ka naam bhi save karein
    doubt.answers.push({ 
      text: answer, 
      user: req.user._id, 
      userName: req.user.name,
      userBatch: userBatch.name // 👈 Naya field add kiya
    });

    await doubt.save();
    res.status(201).json({ message: "Answer added successfully" });
  } catch (err) {
    console.error("Post Answer Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteDoubt = async (req, res) => {
    try {
      const { doubtId } = req.params;
      const doubt = await Doubt.findById(doubtId);
      if (!doubt) return res.status(404).json({ message: "Doubt not found" });
  
      // Only the student who posted it (or admin) can delete
      if (!doubt.student.equals(req.user._id)) {
        return res.status(403).json({ message: "You cannot delete this doubt" });
      }
  
      await Doubt.findByIdAndDelete(doubtId);
      res.status(200).json({ message: "Doubt deleted successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  };
  
  // OPTIONAL: DELETE an answer


  // DELETE an answer
  export const deleteAnswer = async (req, res) => {
    try {
      const { doubtId, answerId } = req.params;
  
      // Find the doubt document (do NOT use .lean())
      const doubt = await Doubt.findById(doubtId);
      if (!doubt) return res.status(404).json({ message: "Doubt not found" });
  
      // Find the index of the answer to delete
      const answerIndex = doubt.answers.findIndex(
        (ans) => String(ans._id) === String(answerId)
      );
  
      if (answerIndex === -1)
        return res.status(404).json({ message: "Answer not found" });
  
      // Check if logged-in user is the owner of the answer
      if (String(doubt.answers[answerIndex].user) !== String(req.user._id)) {
        return res.status(403).json({ message: "You cannot delete this answer" });
      }
  
      // Remove the answer from the array
      doubt.answers.splice(answerIndex, 1);
  
      // Save the updated doubt
      await doubt.save();
  
      res.json({ message: "Answer deleted successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  };
  