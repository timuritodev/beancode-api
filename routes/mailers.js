// emailRoutes.js
const express = require('express');
const { sendEmail } = require('../models/mailer');

const router = express.Router();

router.post('/', sendEmail);

module.exports = router;
