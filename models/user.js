const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { emailRegex } = require('../utils/utils');
const UnauthorizedError = require('../errors/UnauthorizedError');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    required: true,
    validate: {
      validator: (email) => emailRegex.test(email),
      message: () => 'Введите корректный email',
    },
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  name: {
    type: String,
    minlength: 2,
    maxlength: 30,
    required: true,
  },
}, { versionKey: false });

userSchema.statics.findUserByCredentials = function findUserByCredentials(email, password) {
  return this.findOne({ email }).select('+password')
    .then((info) => {
      if (!info) {
        return Promise.reject(new UnauthorizedError('Неправильные почта или пароль'));
      }

      return bcrypt.compare(password, info.password)
        .then((matched) => {
          if (!matched) {
            return Promise.reject(new UnauthorizedError('Неправильные почта или пароль'));
          }

          const user = info.toObject();
          delete user.password;
          return user;
        });
    });
};

module.exports = {
  User: mongoose.model('user', userSchema),
};
