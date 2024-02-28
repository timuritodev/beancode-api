const express = require('express');
const { celebrateCreateUser, celebrateLoginUser, celebrateEditUser, celebrateChangePassword } = require('../validators/users');
const { createUser, findUserByEmail, findUserByCredentials, getAllUsers, updateUser, findUserById, changePassword } = require('../models/user');
const auth = require('../middlewares/auth');
const jwt = require('jsonwebtoken');

const router = express.Router();

router.get('/users', async (req, res, next) => {
  try {
    const users = await getAllUsers();
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

router.post('/signup', celebrateCreateUser, async (req, res, next) => {
  try {

    const existingUser = await findUserByEmail(req.body.email);
    if (existingUser) {
      throw new Error('Email is already registered');
    }

    const userId = await createUser(req.body);

    const JWT_SALT = req.app.get('config').JWT_SALT;
    const token = jwt.sign({ _id: userId }, JWT_SALT, { expiresIn: '7d' });

    res.status(201).json({ token });
  } catch (error) {
    next(error);
  }
});

router.post('/signin', celebrateLoginUser, async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const user = await findUserByCredentials(email, password);

    if (!user) {
      throw new Error('Invalid email or password');
    }

    const JWT_SALT = req.app.get('config').JWT_SALT;
    const token = jwt.sign({ _id: user.id }, JWT_SALT, { expiresIn: '7d' });

    res.json({ token });
  } catch (error) {
    next(error);
  }
});

router.patch('/users-me', celebrateEditUser, auth, async (req, res, next) => {
  try {
    const userId = req.user._id; 
    const updatedUserData = req.body;

    await updateUser(userId, updatedUserData);
    const user = await findUserById(userId);

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

router.get('/user', auth, async (req, res, next) => {
  try {
    const userId = req.user._id; 
    const user = await findUserById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

router.patch('/change-password', celebrateChangePassword, auth, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { oldPassword, newPassword } = req.body;

    await changePassword(userId, oldPassword, newPassword);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
