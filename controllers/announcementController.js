import mongoose from "mongoose";
import Announcement from "../models/Announcement.js";
import Subject from "../models/Subject.js";
import User from "../models/User.js";

// Create announcement (Teacher)
export const createAnnouncement = async (req, res) => {
  try {
    const { title, description, subject } = req.body;

    if (!title || !description || !subject) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const announcement = await Announcement.create({
      title,
      description,
      subject,
      createdBy: req.user._id,
    });

    res.status(201).json(announcement);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
};

// Get all announcements (optional subject filter)
export const getAnnouncements = async (req, res) => {
  try {
    const { subject } = req.query;
    const user = req.user;

    let filter = {};

    if (user.role === "Teacher") {
      // Fetch all subjects assigned to this teacher
      const teacherSubjects = await Subject.find({ teacher: user._id }).select("_id");
      const subjectIds = teacherSubjects.map((s) => s._id);

      // Only allow announcements for these subjects
      filter.subject = { $in: subjectIds };
    }

    // Apply subject query filter if provided
    if (subject) {
      // Make sure teacher can only filter within their subjects
      if (filter.subject) {
        if (!filter.subject.$in.includes(subject)) {
          return res.json([]); // teacher not allowed to see this subject
        }
      }
      filter.subject = { $in: [subject] };
    }

    const announcements = await Announcement.find(filter)
      .populate("subject", "name")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json(announcements);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
};

// Get announcements by subject (Teacher)
export const getAnnouncementsBySubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const announcements = await Announcement.find({ subject: subjectId })
      .populate("subject", "name")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json(announcements);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
};

// Update announcement
export const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;

    const announcement = await Announcement.findById(id);
    if (!announcement) return res.status(404).json({ message: "Announcement not found." });

    // Optional: Check if current user is creator
    if (!announcement.createdBy.equals(req.user._id)) {
      return res.status(403).json({ message: "Not authorized." });
    }

    announcement.title = title || announcement.title;
    announcement.description = description || announcement.description;
    await announcement.save();

    res.json(announcement);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
};

// Delete announcement
export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findById(id);

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found." });
    }

    // Optional: Check if current user is creator
    if (!announcement.createdBy.equals(req.user._id)) {
      return res.status(403).json({ message: "Not authorized." });
    }

    // Use deleteOne on the document
    await announcement.deleteOne();

    res.json({ message: "Announcement deleted successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
};

// Get announcements for student (based on their enrolled subjects)
export const getAnnouncementsForStudent = async (req, res) => {
  try {
    const student = req.user;
    const { subject } = req.query;

    // Fetch all subjects for student's batch & semester
    const batchSubjects = await Subject.find({
      batch: student.batch,
    }).select("_id");

    // Convert ObjectIds to strings
    const subjectIds = batchSubjects.map((s) => s._id.toString());

    // Build filter
    let filter = { subject: { $in: subjectIds } };

    // If a specific subject is selected (not "all"), filter by that
    if (subject && subject !== "all") {
      if (!subjectIds.includes(subject)) {
        // Student is trying to access a subject not in their batch
        return res.json([]);
      }
      filter.subject =new mongoose.Types.ObjectId(subject); // convert string to ObjectId
    }

    const announcements = await Announcement.find(filter)
      .populate("subject", "name")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json(announcements);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
};
