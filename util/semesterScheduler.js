import cron from "node-cron";
import User from "../models/User.js";
import Courses from "../models/Courses.js";

// Run every 6 months on Jan 1st and July 1st at midnight
cron.schedule("0 0 1 1,7 *", async () => {
  try {


    // Get all students
    const students = await User.find({ role: "Student" }).populate("course");

    for (let student of students) {
      if (!student.course) continue;

      const totalSemesters = student.course.semesters.length;

      // Increment only if not at last semester
      if (student.profile.semester < totalSemesters) {
        student.profile.semester += 1;
        await student.save();

      }
    }


  } catch (err) {
    console.error("❌ Error updating semesters:", err.message);
  }
});
