const bodyParser = require("body-parser");
const express = require("express");
// const mongoose = require('mongoose');
// const mysql = require('mysql2');
const helmet = require("helmet");
const { errors } = require("celebrate");
const cors = require("cors");
// const dotenv = require("dotenv");
// const path = require("path");
// const { login, createUser } = require('./controllers/users');
const productRoutes = require("./routes/products");
const userRoutes = require("./routes/users");
const mailerRoutes = require("./routes/mailers");
const orderRoutes = require("./routes/orders");
const orderBackupRoutes = require("./routes/orderBackups");
const cartRoutes = require("./routes/carts");
const subcriptionRoutes = require("./routes/subscriptions");
const wholesaleRoutes = require("./routes/wholesales");
const promoRoutes = require("./routes/promos");
const sessionCartRoutes = require("./routes/session_carts");
const machineRoutes = require("./routes/machines");
const NotFoundError = require("./errors/NotFoundError");
const { requestLogger, errorLogger } = require("./middlewares/logger");
const errorHandler = require("./middlewares/errorHandler");
const rateLimiter = require("./middlewares/rateLimit");
const { apiProxyDeliver, apiProxyStatus, apiProxyPay, apiProxyDeliverAuth, apiProxyDeliverPrice, apiProxyCountries } = require("./proxy");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const { pool } = require("./utils/utils");

const { PORT = 3001 } = process.env;

const app = express();

app.use(bodyParser.json());

const sessionStore = new MySQLStore(
  {
    createDatabaseTable: true,
    schema: {
      tableName: "sessions",
    },
  },
  pool
);

app.use(
  session({
    secret: "mister_fox",
    resave: false,
    saveUninitialized: true,
    store: sessionStore,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use(
  cors({
    origin: "https://beancode.ru",
    // origin: "http://localhost:5173",
    // origin: "http://localhost:3000",
    credentials: true,
    allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"],
  })
);

const config = {
  JWT_SALT: process.env.JWT_SALT,
};

app.set("config", config);
app.use(requestLogger);
app.use(helmet());
app.use(rateLimiter);

app.get("/crash-test", () => {
  setTimeout(() => {
    throw new Error("Сервер сейчас упадёт");
  }, 0);
});

app.use("/api/api-delivery", apiProxyDeliver);

app.use("/api/api-status", apiProxyStatus);

app.use("/api/api-pay", apiProxyPay);

app.use("/api/api-auth", apiProxyDeliverAuth);

app.use("/api/api-calculate", apiProxyDeliverPrice);

app.use("/api/api-countries", apiProxyCountries);

app.use(productRoutes);

app.use(userRoutes);

app.use(mailerRoutes);

app.use(orderRoutes);

app.use(orderBackupRoutes);

app.use(cartRoutes);

app.use(subcriptionRoutes);

app.use(wholesaleRoutes);

app.use(promoRoutes);

app.use(sessionCartRoutes);

app.use(machineRoutes);

app.use((req, res, next) => next(new NotFoundError("Страница не найдена")));
app.use(errorLogger);
app.use(errors());
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});
