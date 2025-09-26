// models/Notification.js
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },   // short heading
  message: { type: String, required: true }, // detailed content
  type: { type: String, enum: ["Exam", "Attendance", "General", "Assignment"], default: "General" },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Teacher/Admin
  recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // list of students or all
  isRead: { type: Boolean, default: false }, // track if student opened it
}, { timestamps: true });

export default mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
