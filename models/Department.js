// models/Department.js
import mongoose from "mongoose";
import Courses from "./Courses.js";
import User from "./User.js"
const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // e.g., "Science", "Arts"
  code: { type: String, required: true, unique: true }, // e.g., "SCI", "ART"
}, { timestamps: true });

departmentSchema.pre("findOneAndDelete", async function (next) {
  const deptId = this.getQuery()["_id"];

  // delete all courses of this dept
  await Courses.deleteMany({ department: deptId });

  // delete all users (teachers & students) of this dept
  await User.deleteMany({ department: deptId });

  next();
});

export default mongoose.models.Department || mongoose.model("Department", departmentSchema);

