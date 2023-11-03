const bodyParser = require('body-parser');
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const { errors } = require('celebrate');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { login, createUser } = require('./controllers/users');
const auth = require('./middlewares/auth');
const { celebrateCreateUser, celebrateLoginUser } = require('./validators/users');
const NotFoundError = require('./errors/NotFoundError');
const { requestLogger, errorLogger } = require('./middlewares/logger');
const errorHandler = require('./middlewares/errorHandler');
const rateLimiter = require('./middlewares/rateLimit');

const { PORT = 3001, dbName = 'mongodb://localhost:27017/moviesdb' } = process.env;

const app = express();

mongoose.set({ runValidators: true });
mongoose.connect(dbName);

app.use(bodyParser.json());

app.use(cors(
  {
    origin: '*',
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
));

app.use((req, res, next) => {
  res.header({ 'Access-Control-Allow-Origin': '*' });
  next();
});

const config = dotenv.config({
  path: path
    .resolve(process.env.NODE_ENV === 'production' ? '.env' : '.env.common'),
})
  .parsed;

app.set('config', config);
app.use(requestLogger);
app.use(helmet());
app.use(rateLimiter);

app.get('/crash-test', () => {
  setTimeout(() => {
    throw new Error('Сервер сейчас упадёт');
  }, 0);
});

app.post('/signin', celebrateLoginUser, login);
app.post('/signup', celebrateCreateUser, createUser);

app.use('/items', require('./routes/items'));
app.use('/items/:id', require('./routes/items'));

app.use(auth);
app.use('/users', require('./routes/users'));

app.use((req, res, next) => next(new NotFoundError('Страница не найдена')));
app.use(errorLogger);
app.use(errors());
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});
