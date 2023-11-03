const router = require('express').Router();
const { sendEmail } = require('../controllers/mailers');

router.post('/', sendEmail);

module.exports = router;
