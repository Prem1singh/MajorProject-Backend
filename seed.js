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
import dotenv from 'dotenv'

dotenv.config()

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
  ]);
  console.log("🧹 Database cleared");
}

async function seed() {
  await clearDB();

  const password = await bcrypt.hash("123456", 10);

  // 1️⃣ Departments
  const departments = [];
  for (let i = 0; i < 2; i++) {
    departments.push(
      await Department.create({
        name: `Department-${i + 1}`,
        code: `DEPT${i + 1}`,
      })
    );
  }

  // 2️⃣ Courses
  const courses = [];
  for (const [i, dept] of departments.entries()) {
    for (let j = 0; j < 2; j++) {
      courses.push(
        await Course.create({
          name: faker.helpers.arrayElement(["BCA", "MCA", "B.Tech", "MBA"]),
          code: `COURSE${i}${j}`, // ✅ unique
          department: dept._id,
        })
      );
    }
  }

  // 3️⃣ Batches
  const batches = [];
  for (const [i, course] of courses.entries()) {
    for (let j = 0; j < 2; j++) {
      batches.push(
        await Batch.create({
          name: `BATCH-${i + 1}-${j + 1}`, // ✅ unique
          totalSem: 6,
          year: 2022 + j,
          currentSem: faker.number.int({ min: 1, max: 6 }),
          status: "Active",
          dissertation: false,
          course: course._id,
          createdBy: null,
        })
      );
    }
  }

  // 4️⃣ Users
  const deptAdmins = [];
  for (const [i, dept] of departments.entries()) {
    deptAdmins.push(
      await User.create({
        name: faker.person.fullName(),
        email: `deptadmin${i}@example.com`, // ✅ unique
        password,
        role: "DepartmentAdmin",
        employeeId: `EMP-ADMIN-${i}`, // ✅ unique
        department: dept._id,
      })
    );
  }

  const teachers = [];
  for (const [i, dept] of departments.entries()) {
    for (let j = 0; j < 3; j++) {
      teachers.push(
        await User.create({
          name: faker.person.fullName(),
          email: `teacher${i}${j}@example.com`, // ✅ unique
          password,
          role: "Teacher",
          employeeId: `EMP-T-${i}${j}`, // ✅ unique
          department: dept._id,
        })
      );
    }
  }

  const students = [];
  for (const [i, batch] of batches.entries()) {
    for (let j = 0; j < 10; j++) {
      students.push(
        await User.create({
          name: faker.person.fullName(),
          email: `student${i}${j}@example.com`, // ✅ unique
          password,
          role: "Student",
          rollNo: `ROLL-${i}${j}`, // ✅ unique
          batch: batch._id,
          department: courses.find(c => c._id.equals(batch.course)).department,
          semester: batch.currentSem,
        })
      );
    }
  }

  // assign createdBy for batches
  for (const [i, batch] of batches.entries()) {
    batch.createdBy = deptAdmins[i % deptAdmins.length]._id;
    await batch.save();
  }

  // 5️⃣ Subjects
  const subjects = [];
  for (const [i, batch] of batches.entries()) {
    for (let j = 0; j < 3; j++) {
      subjects.push(
        await Subject.create({
          name: faker.word.words(2),
          code: `SUB-${i}${j}`, // ✅ unique
          batch: batch._id,
          teacher: teachers[(i + j) % teachers.length]._id,
          semester: batch.currentSem,
          credits: faker.number.int({ min: 2, max: 6 }),
          type: faker.helpers.arrayElement(["Core", "Elective", "Lab"]),
        })
      );
    }
  }

  // rest (Exams, Marks, Attendance, Assignments) can stay same ✅
  // because no unique constraints there

  console.log("✅ Dummy data seeded successfully!");
  process.exit();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
