// models/AssignmentSubmission.js
import mongoose from "mongoose";

const assignmentSubmissionSchema = new mongoose.Schema(
  {
    assignment: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Assignment", 
      required: true 
    },

    student: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },

    fileUrl: { type: String, required: true }, // uploaded file link

    status: { 
      type: String, 
      enum: ["submitted", "graded", "late","reject"], 
      default: "submitted" 
    },

    obtainedMarks: { type: Number, default: null },

    gradedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      default: null 
    } // who graded the assignment
  },
  { timestamps: true }
);

export default mongoose.models.AssignmentSubmission || 
  mongoose.model("AssignmentSubmission", assignmentSubmissionSchema);
