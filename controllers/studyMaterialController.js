// controllers/studyMaterialController.js
import StudyMaterial from "../models/StudyMaterial.js";
import Subject from "../models/Subject.js";
import mongoose from "mongoose";

// Upload new material (Teacher only)
export const uploadMaterial = async (req, res) => {
    try {
      const { title, description, subject } = req.body;
  
      if (!title || !subject || !req.file) {
        return res.status(400).json({ message: "Title, subject and file are required." });
      }
  
      const newMaterial = await StudyMaterial.create({
        title,
        description,
        subject,
        fileUrl: req.file.path, // Cloudinary URL
        uploadedBy: req.user._id,
      });
  
      res.status(201).json({ message: "Material uploaded successfully", material: newMaterial });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  };
// Get materials for student (based on batch & subject filter)
export const getMaterialsForStudent = async (req, res) => {
  try {
    const { subject } = req.query;

    const subjects = await Subject.find({
      batch: req.user.batch,
    }).select("_id");

    const subjectIds = subjects.map((s) => s._id.toString());

    let filter = { subject: { $in: subjectIds } };
    if (subject && subject !== "all") {
      if (!subjectIds.includes(subject)) return res.json([]);
      filter.subject = new mongoose.Types.ObjectId(subject);
    }

    const materials = await StudyMaterial.find(filter)
      .populate("subject", "name")
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 });

    res.json(materials);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
};

// Get materials for teacher (only their subjects)
export const getMaterialsForTeacher = async (req, res) => {
  try {
    const teacherSubjects = await Subject.find({ teacher: req.user._id }).select("_id");
    const subjectIds = teacherSubjects.map((s) => s._id.toString());

    let filter = { subject: { $in: subjectIds } };
    const { subject } = req.query;
    if (subject && subject !== "all") {
      if (!subjectIds.includes(subject)) return res.json([]);
      filter.subject = new mongoose.Types.ObjectId(subject);
    }

    const materials = await StudyMaterial.find(filter)
      .populate("subject", "name")
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 });

    res.json(materials);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
};

export const editMaterial = async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, subject } = req.body;
      const file = req.file;
  
      const material = await StudyMaterial.findById(id);
      if (!material) return res.status(404).json({ message: "Material not found" });
  
      if (!material.uploadedBy.equals(req.user._id)) {
        return res.status(403).json({ message: "Not authorized" });
      }
  
      if (title) material.title = title;
      if (description) material.description = description;
      if (subject) material.subject = subject;
  
      if (file) {
        if (material.fileId) {
          await cloudinary.uploader.destroy(material.fileId);
        }
        material.fileUrl = file.path;
        material.fileId = file.filename;
      }
  
      await material.save();
      res.json({ message: "Material updated successfully", material });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  };
  
  // Delete Material
  export const deleteMaterial = async (req, res) => {
    try {
      const { id } = req.params;
      const material = await StudyMaterial.findById(id);
      if (!material) return res.status(404).json({ message: "Material not found" });
  
      if (!material.uploadedBy.equals(req.user._id)) {
        return res.status(403).json({ message: "Not authorized" });
      }
  
      if (material.fileId) {
        await cloudinary.uploader.destroy(material.fileId);
      }
  
      await material.deleteOne();
      res.json({ message: "Material deleted successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  };
