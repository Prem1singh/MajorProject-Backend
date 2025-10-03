// models/Department.js
import mongoose from "mongoose";
import Courses from "./Courses.js";
import User from "./User.js"
import Placement from "./Placement.js";
const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // e.g., "Science", "Arts"
  code: { type: String, required: true, unique: true }, // e.g., "SCI", "ART"
}, { timestamps: true });

// departmentSchema.pre("findOneAndDelete", async function (next) {
//   const deptId = this.getQuery()["_id"];

//   // Delete all courses in this department → triggers course hook
//   await Courses.deleteMany({ department: deptId });

//   // Delete all users (teachers & students) in this department
//   await User.deleteMany({ department: deptId });

//   // Delete all placements related to this department
//   await Placement.deleteMany({ department: deptId });

//   next();
// });

export default mongoose.models.Department || mongoose.model("Department", departmentSchema);

