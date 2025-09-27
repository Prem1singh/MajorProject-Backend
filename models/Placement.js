import mongoose from "mongoose";

const placementSchema = new mongoose.Schema(
  {
    company: { type: String, required: true },
    role: { type: String, required: true },
    package: { type: String, required: true },
    eligibility: { type: String, required: true },
    description: { type: String },
    date: { type: Date, required: true },
    batches: [{ type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: true }], // ✅ Multiple batches
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true }, // ✅ Added department
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Placement", placementSchema);
