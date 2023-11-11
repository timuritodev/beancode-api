const express = require('express');
const { celebrateCreateUser, celebrateLoginUser, celebrateEditUser } = require('../validators/users');
const { createUser, findUserByCredentials, getAllUsers } = require('../models/user'); // Assuming you have a getAllUsers function
const auth = require('../middlewares/auth');

const router = express.Router();

// Create a new user
// Get all users
router.get('/users', async (req, res, next) => {
  try {
    const users = await getAllUsers();
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

// Create a new user
router.post('/signup', celebrateCreateUser, async (req, res, next) => {
  try {
    console.log('Received data:', req.body);
    const userId = await createUser(req.body);
    res.status(201).json({ userId });
  } catch (error) {
    next(error);
  }
});

// User login
router.post('/signin', celebrateLoginUser, async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const user = await findUserByCredentials(email, password);

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const { JWT_SALT } = req.app.get('config');
    const token = jwt.sign({ _id: user.id }, JWT_SALT, { expiresIn: '7d' });

    res.json({ token });
  } catch (error) {
    next(error);
  }
});

// // Update user profile
// router.patch('/me', celebrateEditUser, auth, async (req, res, next) => {
//   // Your update logic here
// });

module.exports = router;
