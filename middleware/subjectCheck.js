import mongoose from "mongoose";

// Middleware to check if a teacher has permission for a subject
export const checkSubjectPermission = async (req, res, next) => {
  try {
    // Only applies to teachers
    if (req.user.role !== "Teacher") return next();

    const subjectId = req.body.subject || req.params.subject;
    if (!subjectId || !mongoose.isValidObjectId(subjectId)) {
      return res.status(400).json({ message: "Invalid or missing subject ID" });
    }

    // Check if the teacher has this subject in their teachingAssignments
    const hasPermission = (req.user.teachingAssignments || []).some(
      (ta) => ta.subject.toString() === subjectId.toString()
    );

    if (!hasPermission) {
      return res
        .status(403)
        .json({ message: `You do not have permission for this subject` });
    }

    next();
  } catch (err) {
    console.error("CheckSubjectPermission Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
