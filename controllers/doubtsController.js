import Doubt from "../models/Doubt.js";

// GET all doubts for a batch
export const getAllDoubts = async (req, res) => {
    try {
      const batchId = req.user.batch; // use batch from logged-in user
      if (!batchId) return res.status(400).json({ message: "Batch not found for user" });
  
      const doubts = await Doubt.find({ batch: batchId })
        .sort({ createdAt: -1 })
        .lean(); // convert to plain JS objects
  
      // Add canDelete flags for doubts and answers
      const formattedDoubts = doubts.map((doubt) => ({
        ...doubt,
        canDelete: String(doubt.student) === String(req.user._id),
        answers: doubt.answers.map((ans) => ({
          ...ans,
          canDelete: String(ans.user) === String(req.user._id),
        })),
      }));
  
      res.json(formattedDoubts);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  };

// POST a new doubt
export const postDoubt = async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim())
      return res.status(400).json({ message: "Question is required" });

    // Get student info and batch from authenticated user
    const student = req.user._id;
    const studentName = req.user.name;
    const batch = req.user.batch; // batch comes from user object

    const newDoubt = new Doubt({ student, studentName, batch, question });
    await newDoubt.save();

    res.status(201).json({ message: "Doubt posted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
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
    console.log(doubt.batch,req.user.batch)
    // Only allow answering within the same batch
    if (String(doubt.batch) !== String(req.user.batch._id)) {
      return res.status(403).json({ message: "You cannot answer doubts from another batch" });
    }

    const user = req.user._id;
    const userName = req.user.name;

    doubt.answers.push({ text: answer, user, userName });
    await doubt.save();

    res.status(201).json({ message: "Answer added successfully" });
  } catch (err) {
    console.error(err);
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
  