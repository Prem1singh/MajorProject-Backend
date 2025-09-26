import mongoose from "mongoose";

const examSchema = new mongoose.Schema(
  {
    batch: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Batch", 
      required: true 
    },

    name: { 
      type: String, 
      required: true, 
      trim: true 
    }, // e.g., "Sessional 1", "Midterm", "Final"

    totalMarks: { 
      type: Number, 
      required: true 
    },

    description: { 
      type: String, 
      default: "" 
    },

    // examDate: { 
    //   type: Date, 
    //   default: null 
    // }, // ✅ optional, will be set later via timetable

    type: { 
      type: String, 
      required: true ,
      enum:["sessional","assignment","attendance","semester"]
    }, // ✅ free string, no enum, flexible for department admin

    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    }
  },
  { timestamps: true }
);

export default mongoose.models.Exam || mongoose.model("Exam", examSchema);
