// seed.js
import mongoose from "mongoose";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";

import Department from "./models/Department.js";
import Course from "./models/Courses.js";
import Batch from "./models/Batch.js";
import User from "./models/User.js";
import Subject from "./models/Subject.js";
import Exam from "./models/Exam.js";
import Marks from "./models/Marks.js";
import Attendance from "./models/Attendance.js";
import Assignment from "./models/Assignment.js";
import AssignmentSubmission from "./models/AssignmentSubmission.js";
import StudyMaterial from "./models/StudyMaterial.js";
import Doubt from "./models/Doubt.js";
import Announcement from "./models/Announcement.js";

import dotenv from "dotenv";
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
await mongoose.connect(MONGO_URI);
console.log("✅ MongoDB connected");

// 🧹 Clear DB
async function clearDB() {
  await Promise.all([
    Department.deleteMany(),
    Course.deleteMany(),
    Batch.deleteMany(),
    User.deleteMany(),
    Subject.deleteMany(),
    Exam.deleteMany(),
    Marks.deleteMany(),
    Attendance.deleteMany(),
    Assignment.deleteMany(),
    AssignmentSubmission.deleteMany(),
    StudyMaterial.deleteMany(),
    Doubt.deleteMany(),
    Announcement.deleteMany(),
  ]);
  console.log("🧹 Database cleared");
}

async function seed() {
  await clearDB();

  const password = await bcrypt.hash("123456", 10);

    // Super Admin
    const superAdmin = await User.create({
      name: "Super Admin",
      email: "admin@test.com",
      password: await bcrypt.hash("admin123", 10),
      role: "Admin"
    });
  
  // 1️⃣ Departments
  const departments = [];
  for (let i = 0; i < 2; i++) {
    const dept = await Department.create({
      name: `Department-${i + 1}`,
      code: `DEPT${i + 1}`,
    });
    departments.push(dept);
  }

  // 2️⃣ Courses
  const courses = [];
  for (const [i, dept] of departments.entries()) {
    for (let j = 0; j < 2; j++) {
      const course = await Course.create({
        name: faker.helpers.arrayElement(["BCA", "MCA", "B.Tech", "MBA"]),
        code: `COURSE-${i}-${j}`, // unique
        department: dept._id,
      });
      courses.push(course);
    }
  }

  // 3️⃣ Batches
  const batches = [];
  for (const [i, course] of courses.entries()) {
    for (let j = 0; j < 2; j++) {
      const batch = await Batch.create({
        name: `BATCH-${i + 1}-${j + 1}`, // unique
        totalSem: 6,
        year: 2022 + j,
        currentSem: faker.number.int({ min: 1, max: 6 }),
        status: "Active",
        dissertation: false,
        course: course._id,
        createdBy: null, // will assign later
      });
      batches.push(batch);
    }
  }

  // 4️⃣ Users
  const deptAdmins = [];
  for (const [i, dept] of departments.entries()) {
    const admin = await User.create({
      name: faker.person.fullName(),
      email: `deptadmin${i}@example.com`,
      password,
      role: "DepartmentAdmin",
      employeeId: `EMP-ADMIN-${i}`,
      department: dept._id,
    });
    deptAdmins.push(admin);
  }

  const teachers = [];
  for (const [i, dept] of departments.entries()) {
    for (let j = 0; j < 3; j++) {
      const teacher = await User.create({
        name: faker.person.fullName(),
        email: `teacher${i}-${j}@example.com`,
        password,
        role: "Teacher",
        employeeId: `EMP-T-${i}-${j}`,
        department: dept._id,
      });
      teachers.push(teacher);
    }
  }

  const students = [];
  for (const [i, batch] of batches.entries()) {
    const course = courses.find(c => c._id.equals(batch.course));
    for (let j = 0; j < 10; j++) {
      const student = await User.create({
        name: faker.person.fullName(),
        email: `student${i}-${j}@example.com`,
        password,
        role: "Student",
        rollNo: `ROLL-${i}-${j}`,
        batch: batch._id,
        department: course.department,
        semester: batch.currentSem,
      });
      students.push(student);
    }
  }

  // Assign createdBy for batches
  for (const [i, batch] of batches.entries()) {
    batch.createdBy = deptAdmins[i % deptAdmins.length]._id;
    await batch.save();
  }

  // 5️⃣ Subjects
  const subjects = [];
  for (const [i, batch] of batches.entries()) {
    for (let j = 0; j < 3; j++) {
      const sub = await Subject.create({
        name: faker.word.words({ count: 2 }),
        code: `SUB-${i}-${j}`, // unique
        batch: batch._id,
        teacher: teachers[(i + j) % teachers.length]._id,
        semester: batch.currentSem,
        credits: faker.number.int({ min: 2, max: 6 }),
        type: faker.helpers.arrayElement(["Core", "Elective", "Lab"]),
      });
      subjects.push(sub);
    }
  }

  // 6️⃣ Assignments & Submissions
  const assignments = [];
  for (const sub of subjects) {
    for (let j = 0; j < 2; j++) {
      const assignment = await Assignment.create({
        title: `Assignment ${j + 1} for ${sub.name}`,
        description: faker.lorem.sentence(),
        subject: sub._id,
        fileUrl: faker.internet.url(),
        marks: faker.number.int({ min: 10, max: 100 }),
        deadline: faker.date.future(),
        createdBy: sub.teacher,
      });
      assignments.push(assignment);

      // Assignment Submissions
      const batchStudents = students.filter(s => s.batch.equals(sub.batch));
      for (const stu of batchStudents) {
        await AssignmentSubmission.create({
          assignment: assignment._id,
          student: stu._id,
          fileUrl: faker.internet.url(),
          status: "submitted",
        });
      }
    }
  }

  // 7️⃣ Exams & Marks
  const exams = [];
  for (const batch of batches) {
    for (let j = 0; j < 2; j++) {
      const exam = await Exam.create({
        batch: batch._id,
        name: `Exam-${j + 1} for ${batch.name}`,
        totalMarks: 100,
        description: faker.lorem.sentence(),
        type: "sessional",
        createdBy: deptAdmins[j % deptAdmins.length]._id,
      });
      exams.push(exam);

      // Marks for each subject & student
      const batchSubjects = subjects.filter(s => s.batch.equals(batch._id));
      const batchStudents = students.filter(s => s.batch.equals(batch._id));
      for (const sub of batchSubjects) {
        for (const stu of batchStudents) {
          await Marks.create({
            student: stu._id,
            subject: sub._id,
            exam: exam._id,
            total: 100,
            obtained: faker.number.int({ min: 0, max: 100 }),
            addedBy: deptAdmins[j % deptAdmins.length]._id,
          });
        }
      }
    }
  }

  // 8️⃣ Attendance
  for (const sub of subjects) {
    const batchStudents = students.filter(s => s.batch.equals(sub.batch));
    for (const stu of batchStudents) {
      await Attendance.create({
        student: stu._id,
        subject: sub._id,
        date: faker.date.recent(10),
        status: faker.helpers.arrayElement(["present", "absent"]),
        markedBy: sub.teacher,
      });
    }
  }
//hello

  // 9️⃣ Study Materials
  for (const sub of subjects) {
    await StudyMaterial.create({
      title: `Material for ${sub.name}`,
      description: faker.lorem.sentence(),
      fileUrl: faker.internet.url(),
      uploadedBy: sub.teacher,
      subject: sub._id,
    });
  }

  // 🔟 Doubts
  for (const batch of batches) {
    const batchStudents = students.filter(s => s.batch.equals(batch._id));
    for (let j = 0; j < 3; j++) {
      const stu = batchStudents[j];
      await Doubt.create({
        student: stu._id,
        studentName: stu.name,
        batch: batch._id,
        question: faker.lorem.sentence(),
        answers: [],
      });
    }
  }

  // 1️⃣1️⃣ Announcements
  for (const sub of subjects) {
    await Announcement.create({
      title: `Announcement for ${sub.name}`,
      description: faker.lorem.sentence(),
      subject: sub._id,
      createdBy: sub.teacher,
    });
  }

  console.log("✅ Dummy data seeded successfully!");
  process.exit();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
