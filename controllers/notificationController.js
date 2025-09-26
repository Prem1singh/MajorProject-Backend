import Notification from "../models/Notification.js";
import User from "../models/User.js";

// CREATE NOTIFICATION (Teacher/Admin)
export const createNotification = async (req, res) => {
  try {
    if (!["Teacher", "Admin", "DepartmentAdmin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only teachers/admins can send notifications" });
    }

    const { title, message, type, recipients } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: "Title and message are required" });
    }

    const notification = new Notification({
      title,
      message,
      type: type || "General",
      sender: req.user._id,
      recipients
    });

    await notification.save();
    res.status(201).json({ message: "Notification sent successfully", notification });
  } catch (err) {
    res.status(500).json({ message: "Error sending notification", error: err.message });
  }
};

// GET ALL NOTIFICATIONS FOR LOGGED-IN USER
export const getUserNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipients: req.user._id
    })
      .populate("sender", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(notifications);
  } catch (err) {
    res.status(500).json({ message: "Error fetching notifications", error: err.message });
  }
};
// DELETE NOTIFICATION (Admin/Owner)
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: "Notification not found" });

    // Only Admin, DepartmentAdmin or Sender can delete
    if (!["Admin", "DepartmentAdmin"].includes(req.user.role) &&
        notification.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    await notification.deleteOne();
    res.status(200).json({ message: "Notification deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting notification", error: err.message });
  }
};
