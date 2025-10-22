import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import { CloudinaryStorage } from "multer-storage-cloudinary";

// Cấu hình Cloudinary Storage cho multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const userId = req.userId; // Lấy userId từ req đã được middleware xác thực thêm vào
    const folder = "social_media_app"; // Thư mục lưu trữ trên Cloudinary

    return {
      folder,
      allowed_formats: ["jpg", "png", "jpeg"], // định dạng file được phép tải lên
      public_id: `${userId}_${file.fieldname}`, // ví dụ: 68f3c128_avatar
      overwrite: true, //  ghi đè ảnh cũ
    };
  },
});

// Khởi tạo multer với cấu hình storage
const upload = multer({ storage: storage }); //multer middleware

export default upload;
