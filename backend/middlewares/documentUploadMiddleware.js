const fs = require("fs");
const path = require("path");
const multer = require("multer");

const documentsDirectory = path.join(__dirname, "..", "uploads", "documents");

if (!fs.existsSync(documentsDirectory)) {
  fs.mkdirSync(documentsDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, documentsDirectory);
  },
  filename: (_req, file, callback) => {
    const timestamp = Date.now();
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    callback(null, `${timestamp}-${sanitizedName}`);
  },
});

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/jpg",
]);

const fileFilter = (_req, file, callback) => {
  if (allowedMimeTypes.has(file.mimetype) || file.mimetype.startsWith("image/")) {
    callback(null, true);
    return;
  }

  callback(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "file"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max
  },
});

module.exports = upload;