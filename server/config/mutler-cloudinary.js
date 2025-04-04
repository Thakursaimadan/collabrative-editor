import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import cloudinary from "./cloudinary_config.js";

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "docx_uploads",
    resource_type: "raw",
    //allowed_formats: ["docx", "doc", "pdf"], // Only restrict if you really want
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      return cb(new Error("Only .docx files are allowed"));
    }
    cb(null, true);
  }
});

export default upload;
