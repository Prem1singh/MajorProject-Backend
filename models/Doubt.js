import mongoose from "mongoose";

const answerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  userName: String,
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const doubtSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  studentName: String,
  course: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Course", // 👈 Pointing to Course instead of Batch
    required: true 
  },
  question: { type: String, required: true },
  answers: [answerSchema],
  createdAt: { type: Date, default: Date.now },
});

const Doubt = mongoose.model("Doubt", doubtSchema);
export default Doubt;
