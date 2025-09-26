import express from "express";
import { addStudent, addSubject, addTeacher, assignSubjectsToTeacher, deleteSubject, deleteSubjectTeacher, deleteUser, getAllTeachers, getDeptAdminOverview, getSubjectsByTeacher, getTeacherById, updateStudent, updateSubject, updateSubjectTeacher, updateTeacher,getStudents,getSubjects } from "../controllers/departmentAdminController.js";
import { authMiddleware } from "../middleware/auth.js";


const router = express.Router();

// All routes require login
router.use(authMiddleware);

router.post("/student", addStudent);
// router.get("/students", getAllStudents);
router.get("/students", getStudents);

router.delete("/student/:id", deleteUser);
router.put("/student/:id", updateStudent);

router.get("/overview", authMiddleware,getDeptAdminOverview);


router.post("/teacher", addTeacher);

router.get("/teachers", getAllTeachers);
router.get("/teachers/:id", getTeacherById);
router.put("/teachers/:id", updateTeacher);
router.delete("/teacher/:id", deleteUser);

router.delete("/user/:id", deleteUser);

router.post("/subject", authMiddleware, addSubject);
router.get("/subjects", authMiddleware, getSubjects);
router.put("/subject/:id", authMiddleware, updateSubject);
router.delete("/subject/:id", authMiddleware, deleteSubject);

router.post("/subject/teacher", assignSubjectsToTeacher);
router.get("/subject/teacher/:teacherId", getSubjectsByTeacher);
router.put("/subject/teacher/:subjectId", updateSubjectTeacher);
router.delete("/subject/teacher/:subjectId", deleteSubjectTeacher);


export default router;
