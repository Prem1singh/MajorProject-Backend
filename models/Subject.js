// models/Subject.js
import mongoose from "mongoose";
const { Schema } = mongoose;
import Assignment from "./Assignment.js"
import Attendance from "./Attendance.js"
import Mark from "./Marks.js"


const subjectSchema = new Schema(
  {
    name: { 
      type: String, 
      required: true,
      trim: true 
    },       // e.g., "Mathematics"
    
    code: { 
      type: String, 
      required: true, 
      unique: true,
      uppercase: true 
    },       // e.g., "MATH101"

    batch: { 
      type: Schema.Types.ObjectId, 
      ref: "Batch", 
      required: true 
    },      // ✅ now linked with Batch, not Department

    teacher: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      default: null 
    },      // Role: Teacher

    semester: {
      type: Number,
      required: true,
      min: 1
    },      // ✅ each subject belongs to a specific semester inside the batch

    credits: {
      type: Number,
      default: 4
    },      // ✅ optional, useful for GPA/CGPA

    type: {
      type: String,
      enum: ["Core", "Elective", "Lab", "Project"],
      default: "Core"
    },      // ✅ classification of subject
  },
  { timestamps: true }
);

subjectSchema.pre("findOneAndDelete", async function (next) {
  const subjectId = this.getQuery()["_id"];

  await Assignment.deleteMany({ subject: subjectId });
  await Attendance.deleteMany({ subject: subjectId });
  await Mark.deleteMany({ subject: subjectId });

  next();
});

export default mongoose.models.Subject || mongoose.model("Subject", subjectSchema);
