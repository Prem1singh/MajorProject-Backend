// seed.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { faker } from "@faker-js/faker";

import Department from "./models/Department.js";
import Course from "./models/Courses.js";
import Batch from "./models/Batch.js";
import User from "./models/User.js";
import Subject from "./models/Subject.js";

import dotenv from "dotenv";
dotenv.config();

const MONGO_URI = process.env.MONGO_URI 
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

  // 1️⃣ Departments (2 only)
  const departments = [];
  for (let i = 0; i < 2; i++) {
    const dept = await Department.create({
      name: `Department-${i + 1}`,
      code: `DEPT${i + 1}`,
    });
    departments.push(dept);
  }

  // 2️⃣ Department Admins
  const deptAdmins = [];
  for (const [i, dept] of departments.entries()) {
    const admin = await User.create({
      name: faker.person.firstName() + " " + faker.person.lastName(),
      email: `deptadmin${i}@example.com`,
      password,
      role: "DepartmentAdmin",
      employeeId: `EMP-ADMIN-${i}`,
      department: dept._id,
    });
    deptAdmins.push(admin);
  }

  // 3️⃣ Courses (2 per department)
  const courses = [];
  for (const [i, dept] of departments.entries()) {
    for (let j = 0; j < 2; j++) {
      const course = await Course.create({
        name: faker.helpers.arrayElement(["BCA", "MCA", "B.Tech", "MBA"]),
        code: `COURSE-${i}-${j}`,
        department: dept._id,
      });
      courses.push(course);
    }
  }

  // 4️⃣ Batches (2 per course)
  const batches = [];
  for (const [i, course] of courses.entries()) {
    for (let j = 0; j < 2; j++) {
      const batch = await Batch.create({
        name: `BATCH-${i + 1}-${j + 1}`,
        totalSem: 6,
        year: 2023 + j,
        currentSem: faker.number.int({ min: 1, max: 6 }) ,
        status: "Active",
        dissertation: false,
        course: course._id,
        createdBy: deptAdmins[i % deptAdmins.length]._id,
      });
      batches.push(batch);
    }
  }

  // 5️⃣ Teachers (2 per department)
  const teachers = [];
  for (const [i, dept] of departments.entries()) {
    for (let j = 0; j < 2; j++) {
      const teacher = await User.create({
        name: faker.person.firstName() + " " + faker.person.lastName(),
        email: `teacher${i}-${j}@example.com`,
        password,
        role: "Teacher",
        employeeId: `EMP-T-${i}-${j}`,
        department: dept._id,
      });
      teachers.push(teacher);
    }
  }

  // 6️⃣ Students (5 per batch)
  const students = [];
  for (const [i, batch] of batches.entries()) {
    const course = courses.find(c => c._id.equals(batch.course));
    for (let j = 0; j < 5; j++) {
      const student = await User.create({
        name: faker.person.firstName() + " " + faker.person.lastName(),
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

  // 7️⃣ Subjects (3 per batch)
  const subjects = [];
  for (const [i, batch] of batches.entries()) {
    for (let j = 0; j < 3; j++) {
      const sub = await Subject.create({
        name: faker.commerce.productName(),
        code: `SUB-${i}-${j}`,
        batch: batch._id,
        teacher: teachers[(i + j) % teachers.length]._id,
        semester: batch.currentSem,
        credits: faker.number.int({ min: 1, max: 6 }),
        type: faker.helpers.arrayElement(["Core", "Elective", "Lab"]),
      });
      subjects.push(sub);
    }
  }

  console.log("✅ Dummy data seeded successfully!");
  process.exit();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
