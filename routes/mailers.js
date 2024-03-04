const express = require("express");
const { sendEmailInfo, sendOrderDetails } = require("../models/mailer");

const router = express.Router();

router.post("/send-email", async (req, res) => {
  try {
    const { email, subject, text, greetings } = req.body;
    await sendEmailInfo({ email, subject, text });
    await sendOrderDetails({ email, greetings });

    res.json({ success: true });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
