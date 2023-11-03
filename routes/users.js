const router = require('express').Router();
const { celebrateEditUser } = require('../validators/users');

const {
  getCurrentUser,
  updateUser,
} = require('../controllers/users');

router.get('/me', getCurrentUser);
router.patch('/me', celebrateEditUser, updateUser);

module.exports = router;
