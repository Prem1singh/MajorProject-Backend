// controllers/authController.js
import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import nodemailer from "nodemailer";

// Utility to send emails
const sendEmail = async ({ to, subject, html }) => {
  const transporter = nodemailer.createTransport({
    service: "gmail", // or your SMTP service
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"UniTrack System" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};

// ----------------- REQUEST PASSWORD RESET -----------------
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour expiry
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password/${resetToken}`;

    const emailTemplate = (link, name) => `
      <div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 20px;">
        <div style="max-width: 600px; margin:auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
          <div style="background:#4f46e5; color:#fff; text-align:center; padding:20px;">
            <h1>UniTrack</h1>
          </div>
          <div style="padding:30px; color:#333;">
            <h2>Hi ${name || "User"},</h2>
            <p>You requested a password reset. Click below to reset your password:</p>
            <p style="text-align:center; margin:30px 0;">
              <a href="${link}" style="background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;">Reset Password</a>
            </p>
            <p>If you didn’t request this, ignore this email.</p>
            <p style="font-size:12px;color:#888;">This link will expire in 1 hour.</p>
          </div>
          <div style="background:#f3f4f6; text-align:center; padding:15px; font-size:12px; color:#666;">
            &copy; ${new Date().getFullYear()} UniTrack. All rights reserved.
          </div>
        </div>
      </div>
    `;

    // Send email
    await sendEmail({ to: user.email, subject: "Password Reset Request", html: emailTemplate(resetUrl, user.name) });

    res.status(200).json({ message: "Password reset link sent to your email" });
  } catch (err) {
    console.error("Request Password Reset Error:", err);
    res.status(500).json({ message: "Error sending reset link", error: err.message });
  }
};

// ----------------- RESET PASSWORD -----------------
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) return res.status(400).json({ message: "Password is required" });

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired token" });

    // Hash new password
    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({ message: "Password has been reset successfully" });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ message: "Error resetting password", error: err.message });
  }
};
