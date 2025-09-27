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
  batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: true }, // associate with batch
  question: { type: String, required: true },
  answers: [answerSchema],
  createdAt: { type: Date, default: Date.now },
});

const Doubt = mongoose.model("Doubt", doubtSchema);
export default Doubt;
