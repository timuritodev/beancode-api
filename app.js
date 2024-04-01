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
const NotFoundError = require("./errors/NotFoundError");
const { requestLogger, errorLogger } = require("./middlewares/logger");
const errorHandler = require("./middlewares/errorHandler");
const rateLimiter = require("./middlewares/rateLimit");
const { createProxyMiddleware } = require("http-proxy-middleware");
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
      // columnNames: {
      //   session_id: 'custom_session_id',
      //   expires: 'custom_expires_column_name',
      //   data: 'custom_data_column_name'
      // }
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
      httpOnly: false,
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://beancode.ru");
  res.header("Access-Control-Allow-Credentials", true);
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  next();
});

// app.options('*', (req, res) => {
//   res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE');
//   res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Добавьте дополнительные заголовки, если это необходимо
//   res.status(200).send();
// });

// app.use(
//   cors({
//     origin: "https://beancode.ru/",
//     credentials: true,
//     allowedHeaders: ["Content-Type", "Authorization"],
//   })
// );

// app.use((req, res, next) => {
//   res.header({ "Access-Control-Allow-Origin": "*" });
//   next();
// });

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

const proxyOptionsDeliver = {
  target: "https://api.edu.cdek.ru/v2/orders",
  // target: 'https://api.cdek.ru/v2/orders',
  changeOrigin: true,
  pathRewrite: {
    "^/api-deliver": "", // You can modify this if needed
  },
};

const apiProxyDeliver = createProxyMiddleware(
  "/api-other",
  proxyOptionsDeliver
);

const proxyOptionsStatus = {
  target: "https://payment.alfabank.ru/payment/rest/getOrderStatus.do",
  changeOrigin: true,
  pathRewrite: {
    "^/api-status": "",
  },
};

const apiProxyStatus = createProxyMiddleware("/api-status", proxyOptionsStatus);

const proxyOptionsPay = {
  target: "https://payment.alfabank.ru/payment/rest/register.do",
  // target: "https://alfa.rbsuat.com/payment/rest/register.do",
  changeOrigin: true,
  pathRewrite: {
    "^/api-pay": "",
  },
};

const apiProxy = createProxyMiddleware("/api-pay", proxyOptionsPay);

app.use("/api-deliver", apiProxyDeliver);

app.use("/api-status", apiProxyStatus);

app.use("/api-pay", apiProxy);

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

app.use((req, res, next) => next(new NotFoundError("Страница не найдена")));
app.use(errorLogger);
app.use(errors());
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});
