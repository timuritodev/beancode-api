const express = require('express');
const { celebrateCreateUser, celebrateLoginUser, celebrateEditUser } = require('../validators/users');
const { createUser, findUserByCredentials, getAllUsers, updateUser, findUserById } = require('../models/user');
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
    const userId = await createUser(req.body);

    // After creating the user, issue a token
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
      throw new UnauthorizedError('Invalid email or password');
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
    const userId = req.user._id; // Assuming you have a middleware that sets the user ID in the request object during authentication
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
    const userId = req.user._id; // Assuming you have a middleware that sets the user ID in the request object during authentication
    const user = await findUserById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
