const express = require("express");
const upload = require("../config/cloudinaryStorage");

const router = express.Router();

router.post("/image", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }

  res.status(200).json({
    success: true,
    url: req.file.path,
    public_id: req.file.filename,
  });
});

module.exports = router;
