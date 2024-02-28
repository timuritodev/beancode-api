const { celebrate, Joi } = require('celebrate');

module.exports.celebrateCreateUser = celebrate({
  body: Joi.object().keys({
    name: Joi.string().required(),
    surname: Joi.string().required(),
    phone: Joi.string().required(),
    email: Joi.string().email().required(),
    address: Joi.string().required(),
    password: Joi.string().required(),
    city: Joi.string().required(),
    area: Joi.string().allow(''),
  }),
});

module.exports.celebrateLoginUser = celebrate({
  body: Joi.object().keys({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
});

module.exports.celebrateEditUser = celebrate({
  body: Joi.object().keys({
    name: Joi.string().optional(),
    surname: Joi.string().optional(),
    phone: Joi.string().optional(),
    email: Joi.string().email().optional(),
    address: Joi.string().optional(),
    password: Joi.string().optional(),
    city: Joi.string().optional(),
    area: Joi.string().allow(''),
  }),
});

module.exports.celebrateChangePassword = celebrate({
  body: Joi.object().keys({
    userId: Joi.number().required(),
    oldPassword: Joi.string().required(),
    newPassword: Joi.string().required(),
  }),
});
