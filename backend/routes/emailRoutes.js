const express = require("express");
const { sendTestEmail } = require("../utils/emailService");

const router = express.Router();

router.post("/test", async (req, res) => {
  try {
    const { to } = req.body || {};
    await sendTestEmail({ to });

    res.status(200).json({
      message: "Test email sent successfully.",
      to: to || process.env.EMAIL_FROM,
    });
  } catch (error) {
    console.error("Failed to send test email:", error);
    res.status(500).json({
      message: "Failed to send test email.",
      error: error.message,
    });
  }
});

module.exports = router;
