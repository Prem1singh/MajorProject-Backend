import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from 'dotenv'
import userRouters from "./routers/userRouters.js";
import assignmentRouters from "./routers/assignmentRouters.js";
import attendanceRouters from "./routers/attendanceRouters.js";
import marksRouters from "./routers/marksRouters.js";

import adminRouters from "./routers/adminRouters.js";
import departmentAdminRouters from "./routers/departmentAdminRouters.js";
import accessRouters from "./routers/accessRouters.js";
import authRouters from "./routers/authRouters.js";
import courseRouters from "./routers/courseRouters.js";
import batchRouters from "./routers/batchRouters.js";
import teacherRouters from "./routers/teacherRouters.js";
import examRouters from "./routers/examRouters.js";
import studentRouters from "./routers/studentRouters.js";
import announcementRoutes from "./routers/announcementRoutes.js";
import studyMaterialRoutes from "./routers/studyMaterialRoutes.js";
import doubtsRouters from "./routers/doubtsRouters.js";
import placementRouters from "./routers/placementRouters.js";


import "./util/semesterScheduler.js";


dotenv.config()
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.get("/", (req, res) => {
  res.send("MERN Academic Management API Running2");
});

// Example Route
app.use("/api/courses", courseRouters);  //for forget password

app.use("/api/auth",authRouters );  //for forget password
app.use("/api/admin",adminRouters );
app.use("/api/batches",batchRouters );
app.use("/api/teachers", teacherRouters);
app.use("/api/departmentAdmin", departmentAdminRouters);
app.use("/api/access",accessRouters );
app.use("/api/users", userRouters);
app.use("/api/assignments", assignmentRouters);
app.use("/api/attendance", attendanceRouters);
app.use("/api/marks", marksRouters);
app.use("/api/exams", examRouters);
app.use("/api/students", studentRouters);
app.use("/api/announcements", announcementRoutes);
app.use("/api/study", studyMaterialRoutes);
app.use("/api/doubts", doubtsRouters);
app.use("/api/placements", placementRouters);



 //major project
mongoose.connect(process.env.MONGO_URI)
.then(() => {
  console.log("MongoDB connected successfully");
  app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
  });
})
.catch((err) => {
  console.error("MongoDB connection error:", err.message);
});
