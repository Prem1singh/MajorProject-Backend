import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    student: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },

    subject: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Subject", 
      required: true 
    },

    date: { 
      type: Date, 
      required: true 
    },

    status: { 
      type: String, 
      enum: ["present", "absent"], 
      required: true 
    },

    markedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    } // teacher who marked attendance
  },
  { timestamps: true }
);

// Prevent duplicate attendance for same student, subject, and date
attendanceSchema.index({ student: 1, subject: 1, date: 1 }, { unique: true });

export default mongoose.models.Attendance || mongoose.model("Attendance", attendanceSchema);
