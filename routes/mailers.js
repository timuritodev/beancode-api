const express = require('express');
const { sendEmail } = require('../models/mailer');

const router = express.Router();

router.post('/send-email', async (req, res) => {
  try {
    const { from, subject, text } = req.body;
    await sendEmail({ from, subject, text });

    res.json({ success: true });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
