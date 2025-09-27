import User from "../models/User.js";
import Department from "../models/Department.js";
import Subject from "../models/Subject.js";
import bcrypt from "bcryptjs";
import Course from "../models/Courses.js";
import Assignment from "../models/Assignment.js";
import Attendance from "../models/Attendance.js";
import Batch from "../models/Batch.js";
import AssignmentSubmission from "../models/AssignmentSubmission.js";
import mongoose from "mongoose";
import { sendCredentialsEmail } from "../util/emailService.js";
import Marks from "../models/Marks.js";
import Exam from "../models/Exam.js";
// --------------------
// Add Student
// --------------------
export const addStudent = async (req, res) => {
  try {
    if (req.user.role !== "DepartmentAdmin") {
      return res.status(403).json({ message: "Access denied. Department Admins only." });
    }

    const { name, email, password, rollNo, batch } = req.body;

    // Check if email already exists
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already exists" });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create student
    const student = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "Student",
      batch, // ✅ assign batch here
      department: req.user.department, // link to admin's department
      rollNo, // can also be at root level
    });
    await sendCredentialsEmail(email, name, password, "Student");

    res.status(201).json({ message: "Student added successfully", student });
  } catch (err) {
    console.error("Add Student Error:", err);
    res.status(500).json({ message: "Error adding student", error: err.message });
  }
};


export const updateStudent = async (req, res) => {
  try {
    // Only DepartmentAdmin can update students
    if (req.user.role !== "DepartmentAdmin") {
      return res.status(403).json({ message: "Access denied. Department Admins only." });
    }

    const { id } = req.params; // student ID
    const { name, email, password, rollNo, batch } = req.body;

    const student = await User.findById(id);
    if (!student || student.role !== "Student") {
      return res.status(404).json({ message: "Student not found" });
    }

    // Ensure student belongs to same department as admin
    if (student.department.toString() !== req.user.department.toString()) {
      return res.status(403).json({ message: "You can only update students from your department" });
    }

    // Update fields if provided
    if (name) student.name = name;
    if (email) student.email = email;
    if (password) student.password = await bcrypt.hash(password, 10);
    if (rollNo) student.rollNo = rollNo;
    if (batch) student.batch = batch;
    await student.save();

    res.status(200).json({ message: "Student updated successfully", student });
  } catch (err) {
    console.error("Update Student Error:", err);
    res.status(500).json({ message: "Error updating student", error: err.message });
  }
};

// --------------------
// Add Teacher
// --------------------


export const addTeacher = async (req, res) => {
  try {
    const { name, email, employeeId, password } = req.body;

    // only DepartmentAdmin can add
    if (req.user.role !== "DepartmentAdmin") {
      return res.status(403).json({ message: "Only Department Admins can add teachers" });
    }

    // check if email already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Teacher with this email already exists" });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const teacher = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "Teacher",
        employeeId,
        department:req.user.department,
    });

    await sendCredentialsEmail(email, name, password, "Teacher");

    res.status(201).json({
      message: "Teacher added successfully",
      teacher,
    });
  } catch (err) {
    console.error("Error adding teacher:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


export const updateTeacher = async (req, res) => {
  try {
    if (req.user.role !== "DepartmentAdmin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { id } = req.params;
    const { name, email, employeeId, department } = req.body;

    const teacher = await User.findById(id);
    if (!teacher || teacher.role !== "Teacher") {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // Update fields
    if (name) teacher.name = name;
    if (email) teacher.email = email;
    if (employeeId) teacher.employeeId = employeeId;
    if (department) teacher.department = department;

    await teacher.save();

    res.json({ message: "Teacher updated successfully", teacher });
  } catch (error) {
    console.error("Update Teacher Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// --------------------
// View Students/Teachers in Department
// --------------------
export const getDepartmentUsers = async (req, res) => {
  try {
    if (req.user.role !== "DepartmentAdmin")
      return res.status(403).json({ message: "Access denied. Department Admins only." });

    const students = await User.find({
      role: "Student",
      "profile.department": req.user.profile.department
    });

    const teachers = await User.find({
      role: "Teacher",
      "profile.department": req.user.profile.department
    });

    res.status(200).json({ students, teachers });
  } catch (err) {
    res.status(500).json({ message: "Error fetching users", error: err.message });
  }
};

// --------------------
// ADD NEW SUBJECT
// --------------------


// Add new subject
export const addSubject = async (req, res) => {
  try {
    if (req.user.role !== "DepartmentAdmin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const { name, code, teacher, batch, semester, credits, type } = req.body;


    // Validate required fields
    if (!name || !code || !batch || !semester) {
      return res.status(400).json({ message: "Name, code, batch, and semester are required" });
    }

    // Check if batch exists
    const batchObj = await Batch.findById(batch);
    if (!batchObj) return res.status(404).json({ message: "Batch not found" });

    // If teacher is provided, validate teacher exists and is Teacher role
    if (teacher) {
      const teacherObj = await User.findById(teacher);
      if (!teacherObj || teacherObj.role !== "Teacher") {
        return res.status(404).json({ message: "Teacher not found or invalid" });
      }
    }

    // Check if subject code already exists in this batch
    const existingSub = await Subject.findOne({ code: code.toUpperCase(), batch });
    if (existingSub) {
      return res.status(400).json({ message: "Subject code already exists in this batch" });
    }


    const subject = await Subject.create({
      name,
      code: code.toUpperCase(),
      batch,
      teacher: teacher || null,
      semester,
      credits: credits || 4,
      type: type || "Core",
    });

    res.status(201).json({ message: "Subject added successfully", subject });
  } catch (err) {
    console.error("Add Subject Error:", err);
    res.status(500).json({ message: "Error adding subject", error: err.message });
  }
};

// Get all subjects (for DepartmentAdmin)
// Get all subjects (optionally filter by batch)
export const getSubjects = async (req, res) => {
  try {
    const { batchId, semester } = req.query; // 🔹 optional semester filter
    let query = {};

    // 🔹 Restrict DepartmentAdmin to their own department
    if (req.user.role === "DepartmentAdmin") {
      // 1️⃣ Get courses in the admin's department
      const courses = await Course.find({ department: req.user.department }).select("_id");
      const courseIds = courses.map((c) => c._id);

      // 2️⃣ Get batches in those courses
      const batches = await Batch.find({ course: { $in: courseIds } })
        .select("_id currentSem"); // ✅ include currentSem

      const batchIds = batches.map((b) => b._id.toString());

      if (batchId) {
        // ✅ Only allow if batch belongs to this department
        if (!batchIds.includes(batchId)) {
          return res.status(403).json({ message: "Access denied for this batch" });
        }
        query.batch = new mongoose.Types.ObjectId(batchId);

        // ✅ If no semester passed, use this batch's currentSem
        if (!semester) {
          const batch = batches.find((b) => b._id.toString() === batchId);
          if (batch?.currentSem) query.semester = batch.currentSem;
        }
      } else {
        // ✅ Fetch all batches of this department
        query.batch = { $in: batchIds.map((id) => new mongoose.Types.ObjectId(id)) };

        // If semester is given → filter all subjects of that semester
        if (semester) {
          query.semester = Number(semester);
        }
      }
    } else {
      // Admin (superadmin) can query any batch
      if (batchId) {
        query.batch = new mongoose.Types.ObjectId(batchId);

        // Auto apply currentSem if no semester explicitly given
        const batch = await Batch.findById(batchId).select("currentSem");
        if (!semester && batch?.currentSem) {
          query.semester = batch.currentSem;
        }
      }
      if (semester) query.semester = Number(semester);
    }

    // 🔹 Fetch subjects with teacher & batch populated
    const subjects = await Subject.find(query)
      .populate("teacher", "name email employeeId")
      .populate("batch", "name code currentSem");

    res.status(200).json(subjects);
  } catch (err) {
    console.error("Error fetching subjects:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch subjects", error: err.message });
  }
};



// Update subject
export const updateSubject = async (req, res) => {
  try {
    if (req.user.role !== "DepartmentAdmin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { id } = req.params;
    const { name, code, teacher, batch, semester, credits, type } = req.body;

    const subject = await Subject.findById(id);
    if (!subject) return res.status(404).json({ message: "Subject not found" });

    // Validate teacher if updated
    if (teacher) {
      const teacherObj = await User.findById(teacher);
      if (!teacherObj || teacherObj.role !== "Teacher") {
        return res.status(404).json({ message: "Teacher not found or invalid" });
      }
      subject.teacher = teacher;
    }

    // Validate batch if updated
    if (batch) {
      const batchObj = await Batch.findById(batch);
      if (!batchObj) return res.status(404).json({ message: "Batch not found" });
      subject.batch = batch;
    }

    // Update other fields
    if (name) subject.name = name;
    if (code) subject.code = code.toUpperCase();
    if (semester) subject.semester = semester;
    if (credits) subject.credits = credits;
    if (type) subject.type = type;

    await subject.save();

    res.status(200).json({ message: "Subject updated successfully", subject });
  } catch (err) {
    console.error("Update Subject Error:", err);
    res.status(500).json({ message: "Error updating subject", error: err.message });
  }
};

// Delete subject
export const deleteSubject = async (req, res) => {
  try {
    if (req.user.role !== "DepartmentAdmin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { id } = req.params;

    const subject = await Subject.findById(id);
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    // Delete assignments of this subject
    const assignments = await Assignment.find({ subject: subject._id });
    await AssignmentSubmission.deleteMany({ assignment: { $in: assignments.map(a => a._id) } });
    await Assignment.deleteMany({ subject: subject._id });

    // Delete attendance linked to this subject
    await Attendance.deleteMany({ subject: subject._id });

    // Finally delete subject
    await Subject.findByIdAndDelete(subject._id);

    res.status(200).json({ message: "Subject and related data deleted successfully" });
  } catch (err) {
    console.error("Delete Subject Error:", err);
    res.status(500).json({
      message: "Error deleting subject",
      error: err.message,
    });
  }
};



// ✅ DELETE SUBJECT (by DepartmentAdmin)
// ------------------
// ASSIGN SUBJECTS TO TEACHER
// --------------------
// Assign multiple subjects to a teacher
export const assignSubjectsToTeacher = async (req, res) => {
  try {
    if (req.user.role !== "DepartmentAdmin") {
      return res.status(403).json({ message: "Access denied. Department Admins only." });
    }

    const { teacherId, subjectIds } = req.body; // subjectIds = [array of Subject ObjectId]

    if (!teacherId || !subjectIds || !Array.isArray(subjectIds) || subjectIds.length === 0) {
      return res.status(400).json({ message: "teacherId and subjectIds are required" });
    }

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== "Teacher") {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // Ensure all subjects exist and belong to the DepartmentAdmin's department
    const subjects = await Subject.find({ _id: { $in: subjectIds } });

    if (subjects.length !== subjectIds.length) {
      return res.status(404).json({ message: "One or more subjects not found" });
    }

    // Department check: DeptAdmin can only assign subjects in their department
    const invalidSubjects = subjects.filter(
      (s) => s.department.toString() !== req.user.profile.department.toString()
    );
    if (invalidSubjects.length > 0) {
      return res.status(403).json({ message: "You can only assign subjects from your department" });
    }

    // Assign teacher to each subject
    for (let subject of subjects) {
      subject.teacher = teacher._id;
      await subject.save();
    }

    // Optionally: populate the teacher and department info for response
    const populatedSubjects = await Subject.find({ _id: { $in: subjectIds } })
      .populate("teacher", "name email")
      .populate("department", "name");

    res.status(200).json({
      message: "Subjects assigned to teacher successfully",
      teacher: { _id: teacher._id, name: teacher.name, email: teacher.email },
      subjects: populatedSubjects
    });
  } catch (err) {
    res.status(500).json({ message: "Error assigning subjects", error: err.message });
  }
};

export const getSubjectsByTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const teacher = await User.findById(teacherId).populate("subjects");
    if (!teacher || teacher.role !== "Teacher") {
      return res.status(404).json({ message: "Teacher not found" });
    }
    res.status(200).json({
      message: "Subjects fetched successfully",
      count: teacher.subjects.length,
      subjects:teacher.subjects
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching teacher subjects", error: err.message });
  }
};

// Assign or change teacher for a subject
export const updateSubjectTeacher = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { teacherId } = req.body;

    if (!teacherId) return res.status(400).json({ message: "teacherId is required" });

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== "Teacher") {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(404).json({ message: "Subject not found" });

    if (req.user.role === "DepartmentAdmin" && 
        subject.department.toString() !== req.user.profile.department.toString()) {
      return res.status(403).json({ message: "You can only assign teachers to subjects in your department" });
    }

    subject.teacher = teacherId;
    await subject.save();

    // Correct population
    await subject.populate("department", "name");
    await subject.populate("teacher", "name email");

    res.status(200).json({ message: "Teacher assigned to subject successfully", subject });
  } catch (err) {
    res.status(500).json({ message: "Error assigning teacher to subject", error: err.message });
  }
};

// Remove teacher from a subject
export const deleteSubjectTeacher = async (req, res) => {
  try {
    const { subjectId } = req.params;

    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(404).json({ message: "Subject not found" });

    if (req.user.role === "DepartmentAdmin" && 
        subject.department.toString() !== req.user.profile.department.toString()) {
      return res.status(403).json({ message: "You can only unassign teachers from subjects in your department" });
    }

    subject.teacher = null;
    await subject.save();

    // Correct population
    await subject.populate("department", "name");

    res.status(200).json({ message: "Teacher unassigned from subject successfully", subject });
  } catch (err) {
    res.status(500).json({ message: "Error unassigning teacher from subject", error: err.message });
  }
};


// DELETE USER (Admin Only)
export const deleteUser = async (req, res) => {
  try {
    if (req.user.role !== "DepartmentAdmin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Cascade handling based on role
    if (user.role === "Student") {
      await AssignmentSubmission.deleteMany({ student: user._id });
      await Attendance.deleteMany({ student: user._id });
    }

    if (user.role === "Teacher") {
      // Delete assignments created by teacher
      const teacherAssignments = await Assignment.find({ createdBy: user._id });
      await AssignmentSubmission.deleteMany({ assignment: { $in: teacherAssignments.map(a => a._id) } });
      await Assignment.deleteMany({ createdBy: user._id });

      // Optionally, remove teacher from subjects
      await Subject.updateMany(
        { teacher: user._id },
        { $unset: { teacher: "" } }
      );
    }

    // Finally delete the user
    await User.findByIdAndDelete(id);

    res.status(200).json({ message: `${user.role} deleted successfully` });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ message: "Error deleting user", error: err.message });
  }
};

// controllers/teacherController.js


// Get all teachers
export const getAllTeachers = async (req, res) => {
  try {
    if (req.user.role !== "DepartmentAdmin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const teachers = await User.find({
      role: "Teacher",
      department: req.user.department, // assuming you store department directly in User
    }).select("name email employeeId");

    res.json(teachers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


// Get single teacher by ID
export const getTeacherById = async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await User.findById(id)
      .select("name email profile employeeId teachingAssignments")
      .populate("teachingAssignments.course", "name")
      .populate("teachingAssignments.subject", "name");

    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    res.json(teacher);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};



export const getStudents = async (req, res) => {
  try {
    const { batchId } = req.query;
    let query = { role: "Student" };

    // 🔹 Restrict DepartmentAdmin to their own department
    if (req.user.role === "DepartmentAdmin") {
      // 1️⃣ Get courses in this department
      const courses = await Course.find({ department: req.user.department }).select("_id");
      const courseIds = courses.map(c => c._id);

      // 2️⃣ Get batches in those courses
      const batches = await Batch.find({ course: { $in: courseIds } }).select("_id");
      const batchIds = batches.map(b => b._id.toString()); // convert to string for comparison

      if (batchId) {
        // ✅ Only allow if batch belongs to this department
        if (!batchIds.includes(batchId)) {
          return res.status(403).json({ message: "Access denied for this batch" });
        }
        query.batch = new mongoose.Types.ObjectId(batchId);
      } else {
        // ✅ All batches in department
        query.batch = { $in: batchIds.map(id => new mongoose.Types.ObjectId(id)) };
      }
    } else {
      // Admin can query any batch
      if (batchId) query.batch = new mongoose.Types.ObjectId(batchId);
    }

    const students = await User.find(query).populate("batch", "name code");
    res.status(200).json(students);
  } catch (err) {
    console.error("Error fetching students:", err);
    res.status(500).json({ message: "Failed to fetch students", error: err.message });
  }
};


// ✅ GET /department-admin/overview
export const getDeptAdminOverview = async (req, res) => {
  try {
    const deptId = req.user.department;

    // ✅ Department info
    const department = await Department.findById(deptId);

    // ✅ All courses & batches
    const courses = await Course.find({ department: deptId });
    const courseIds = courses.map((c) => c._id);

    const batches = await Batch.find({ course: { $in: courseIds } });
    const batchIds = batches.map((b) => b._id);

    // ✅ Students & Teachers
    const studentsCount = await User.countDocuments({
      role: "Student",
      batch: { $in: batchIds },
    });

    const teachersCount = await User.countDocuments({
      role: "Teacher",
      department: deptId,
    });

    // ✅ Assignments count
    const assignmentsCount = await Assignment.countDocuments({
      batch: { $in: batchIds },
    });

    // ✅ Students per course
    const studentsPerCourse = await Promise.all(
      courses.map(async (course) => {
        const courseBatchIds = batches
          .filter((b) => b.course.toString() === course._id.toString())
          .map((b) => b._id);

        const count = await User.countDocuments({
          role: "Student",
          batch: { $in: courseBatchIds },
        });

        return { course: course.name, students: count };
      })
    );

    // ✅ Today’s Attendance
    const today = new Date();
    const start = new Date(today.setHours(0, 0, 0, 0));
    const end = new Date(today.setHours(23, 59, 59, 999));

    const todaysAttendance = await Attendance.find({
      batch: { $in: batchIds },
      date: { $gte: start, $lte: end },
    });

    const attendancePresent = todaysAttendance.reduce((acc, rec) => acc + rec.present.length, 0);
    const attendanceTotal = todaysAttendance.reduce(
      (acc, rec) => acc + rec.present.length + rec.absent.length,
      0
    );

    const attendanceData = [
      { status: "Present", value: attendancePresent },
      { status: "Absent", value: attendanceTotal - attendancePresent },
    ];

    // ✅ Assignment Submissions Trend (last 7 days)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const startDay = new Date(d.setHours(0, 0, 0, 0));
      const endDay = new Date(d.setHours(23, 59, 59, 999));

      const submissions = await AssignmentSubmission.countDocuments({
        assignment: { $in: await Assignment.find({ batch: { $in: batchIds } }).distinct("_id") },
        submittedAt: { $gte: startDay, $lte: endDay },
      });

      last7Days.push({
        date: startDay.toLocaleDateString(),
        submissions,
      });
    }

    // ✅ Recently added teachers
    const recentTeachers = await User.find({
      role: "Teacher",
      department: deptId,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name email empId");

    // ✅ Upcoming Assignment Deadlines
    const deadlines = await Assignment.find({
      batch: { $in: batchIds },
      deadline: { $gte: new Date() },
    })
      .sort({ deadline: 1 })
      .limit(5)
      .populate("batch", "name")
      .select("title deadline batch");

    // ✅ Final Response
    res.json({
      overview: {
        department: department?.name || "N/A",
        courses: courses.length,
        batches: batches.length,
        students: studentsCount,
        teachers: teachersCount,
        assignments: assignmentsCount,
        attendancePresent,
        attendanceTotal,
        deadlines,
      },
      studentsPerCourse,
      attendance: attendanceData,
      assignmentsTrend: last7Days,
      recentTeachers,
    });
  } catch (err) {
    console.error("Error in getDeptAdminOverview:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const getStudentsByBatch = async (req, res) => {
  try {
    const { batch } = req.query;

    if (!batch) return res.status(400).json({ message: "Batch is required" });

    // Find users with role "Student" in the given batch
    const students = await User.find({ role: "Student", batch })
      .select("_id name")
      .lean();

    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get subjects by batch
export const getSubjectsByBatch = async (req, res) => {
  try {
    const { batch } = req.query;
    if (!batch) return res.status(400).json({ message: "Batch is required" });

    const subjects = await Subject.find({ batch }).select("_id name").lean();
    res.json(subjects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get marks by student or subject
export const getMarks = async (req, res) => {
  try {
    const { student, subject, batch } = req.query;

    if (!student && !subject)
      return res.status(400).json({ message: "Student or subject is required" });
    if (!batch) return res.status(400).json({ message: "Batch is required" });

    const query = {};
    if (student) query.student = student;
    if (subject) query.subject = subject;

    // Fetch marks with exam info
    const marks = await Marks.find(query)
      .populate("student", "name rollNo")
      .populate("subject", "name")
      .populate("exam", "name type") // exam object
      .lean();

    // Fetch all exams for the batch to know dynamic columns
    const exams = await Exam.find({ batch }).select("name type").lean();

    // Group marks dynamically
    const grouped = {};
    marks.forEach((m) => {
      const key = student ? m.subject._id : m.student._id;
      if (!grouped[key]) {
        grouped[key] = {
          id: key,
          name: student ? m.subject.name : m.student.name,
          rollNo: student ? m.subject.rollNo : m.student.rollNo,
        };
        // initialize all exam columns dynamically to null
        exams.forEach((exam) => {
          grouped[key][exam.name] = null;
        });
      }
      // Fill obtained marks dynamically
      grouped[key][m.exam.name] = m.obtained;
    });

    // Convert to array for frontend
    const result = Object.values(grouped);

    // Return dynamic exam list and marks
    res.json({
      exams: exams.map((e) => e.name), // frontend can generate columns
      data: result,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getBatchesByDepartment = async (req, res) => {
  try {
    const departmentId = req.user.department; // department from logged-in user
    if (!departmentId) {
      return res.status(400).json({ message: "Department not found in user data" });
    }

    // 1️⃣ Get all courses of the department
    const courses = await Course.find({ department: departmentId }).select("_id").lean();
    const courseIds = courses.map(c => c._id);

    if (!courseIds.length) {
      return res.json([]); // no courses → no batches
    }

    // 2️⃣ Get all batches for these courses
    const batches = await Batch.find({ course: { $in: courseIds } })
      .select("_id name")
      .lean();

    res.json(batches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};