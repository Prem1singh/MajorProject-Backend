// models/Course.js
import mongoose from "mongoose";


const courseSchema = new mongoose.Schema({
  name: { type: String, required: true }, // MCA, BCA, B.Tech CSE
  code:{type:String,required:true,unique: true},
  department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },

}, { timestamps: true });

// courseSchema.pre("findOneAndDelete", async function (next) {
//   const courseId = this.getQuery()["_id"];

//   // Delete all batches in this course → triggers batch hook
//   await Batch.deleteMany({ course: courseId });

//   next();
// });

export default mongoose.models.Course || mongoose.model("Course", courseSchema);
