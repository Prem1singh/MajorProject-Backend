// models/Assignment.js
import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },

    subject: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Subject", 
      required: true 
    },

    fileUrl: { type: String }, // e.g. Cloudinary URL

    marks: { type: Number, required: true }, // total marks for assignment

    deadline: { type: Date, required: true },

    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    } // Teacher or Dept Admin
  },
  { timestamps: true }
);

export default mongoose.models.Assignment || 
  mongoose.model("Assignment", assignmentSchema);
