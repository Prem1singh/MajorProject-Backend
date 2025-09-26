import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "profile_pictures", // ✅ separate folder for user profile pics
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 300, height: 300, crop: "fill" }],
  },
});

const uploadProfile = multer({ storage: profileStorage });

export default uploadProfile;