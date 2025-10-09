import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

// Cloudinary storage with dynamic folder
const cloudStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    if (file.fieldname === "profilePicture") {
      return {
        folder: "profile_pictures",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        transformation: [{ width: 300, height: 300, crop: "fill" }],
      };
    } else if (file.fieldname === "outcomeCertificate") {
      return {
        folder: "outcome_certificates",
        allowed_formats: ["jpg", "jpeg", "png", "pdf"],
      };
    }
    // Ignore unknown fields instead of throwing error
    return null;
  },
});

// Multer instance with 20MB limit per file
const upload = multer({
  storage: cloudStorage,
  limits: { fileSize: 40 * 1024 * 1024 }, // 20MB
});

// Middleware to handle optional files safely
export const uploadFiles = (req, res, next) => {
  const uploadFields = upload.fields([
    { name: "profilePicture", maxCount: 1 },
    { name: "outcomeCertificate", maxCount: 1 },
  ]);

  uploadFields(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Multer-specific errors (like file size exceeded)
      console.error("Multer error:", err);
      return res.status(400).json({ message: err.message });
    } else if (err) {
      // Other errors (Cloudinary, network, etc.)
      console.error("Upload error:", err);
      return res.status(500).json({ message: err.message || "File upload failed" });
    }

    // No error, files may or may not exist
    // Ensure req.files is at least an empty object
    req.files = req.files || {};
    next();
  });
};
