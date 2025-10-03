// models/Subject.js
import mongoose from "mongoose";
const { Schema } = mongoose;
import Assignment from "./Assignment.js"
import Attendance from "./Attendance.js"
import Mark from "./Marks.js"
import AssignmentSubmission from "./AssignmentSubmission.js";
import Announcement from "./Announcement.js";
import StudyMaterial from "./StudyMaterial.js";

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

// subjectSchema.pre("findOneAndDelete", async function (next) {
//   const subjectId = this.getQuery()["_id"];

//   // Delete assignments and their submissions
//   const assignments = await Assignment.find({ subject: subjectId });
//   for (const assign of assignments) {
//     await AssignmentSubmission.deleteMany({ assignment: assign._id });
//   }
//   await Assignment.deleteMany({ subject: subjectId });

//   // Delete attendance records
//   await Attendance.deleteMany({ subject: subjectId });

//   // Delete marks
//   await Mark.deleteMany({ subject: subjectId });

//   // Delete study materials
//   await StudyMaterial.deleteMany({ subject: subjectId });

//   // Delete announcements
//   await Announcement.deleteMany({ subject: subjectId });

//   next();
// });



export default mongoose.models.Subject || mongoose.model("Subject", subjectSchema);
