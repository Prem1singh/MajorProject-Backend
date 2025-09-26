import Announcement from "../models/Announcement.js";
import Subject from "../models/Subject.js";
import User from "../models/User.js";

// Create announcement (Teacher)
export const createAnnouncement = async (req, res) => {
  try {
    const { title, description, subject } = req.body;
    console.log(title,description,subject)
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
    const filter = subject ? { subject } : {};
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
    if (!announcement) return res.status(404).json({ message: "Announcement not found." });

    // Optional: Check if current user is creator
    if (!announcement.createdBy.equals(req.user._id)) {
      return res.status(403).json({ message: "Not authorized." });
    }

    await announcement.remove();
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

    // Assuming student.subjects is an array of enrolled subject IDs
    let filter = { subject: { $in: student.subjects } };
    if (subject) filter.subject = subject;

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
