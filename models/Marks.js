import mongoose from "mongoose";

const marksSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },

    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",   // 🔹 create an Exam model (e.g., Midterm, Final, Sessional 1)
      required: true,
    },

    total: {
      type: Number,
      required: true,
    },

    obtained: {
      type: Number,
      required: true,
    },

    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",   // Teacher/Admin who entered the marks
      required: true,
    }
  },
  { timestamps: true }
);

// Prevent duplicate marks for the same student, subject, and exam
marksSchema.index({ student: 1, subject: 1, exam: 1 }, { unique: true });

export default mongoose.models.Marks || mongoose.model("Marks", marksSchema);
