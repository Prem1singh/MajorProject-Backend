import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "assignments",
    resource_type: "auto" // pdf, docx, images, etc.
  },
});

const upload = multer({ storage });

export default upload;
