const jwt = require('jsonwebtoken');
const UnauthorizedError = require('../errors/UnauthorizedError');

// eslint-disable-next-line consistent-return
module.exports = (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Авторизация необходима'));
  }

  const token = authorization.replace('Bearer ', '');
  let payload;
  const { JWT_SALT } = req.app.get('config');

  try {
    payload = jwt.verify(token, JWT_SALT);
    req.user = payload;
    next();
  } catch (err) {
    next(new UnauthorizedError('Необходима авторизация'));
    next();
  }
};
