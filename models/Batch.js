import mongoose from "mongoose";
import Subject from "./Subject.js";
import Doubt from "./Doubt.js";
import Placement from "./Placement.js";

const batchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true, // e.g., "BCA-2023"
      trim: true,
    },
    totalSem: {
      type: Number,
      required: true,
    },
    year: {
      type: Number,
      required: true, // admission year
    },
    currentSem: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ["Active", "Completed"],
      default: "Active",
    },
    dissertation: {
      type: Boolean,
      default: false,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",

    },
  },
  { timestamps: true }
);

// batchSchema.pre("findOneAndDelete", async function (next) {
//   const batchId = this.getQuery()["_id"];

//   // Delete all subjects in this batch → triggers subject hook
//   await Subject.deleteMany({ batch: batchId });

//   // Delete all doubts associated with this batch
//   await Doubt.deleteMany({ batch: batchId });

//   // Remove this batch from all placements' batches array
//   await Placement.updateMany(
//     { batches: batchId },
//     { $pull: { batches: batchId } }
//   );

//   next();
// });

const Batch = mongoose.model("Batch", batchSchema);
export default Batch;
