const bodyParser = require("body-parser");
const express = require("express");
// const mongoose = require('mongoose');
// const mysql = require('mysql2');
const helmet = require("helmet");
const { errors } = require("celebrate");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
// const { login, createUser } = require('./controllers/users');
const productRoutes = require("./routes/products");
const userRoutes = require("./routes/users");
const mailerRoutes = require("./routes/mailers");
const orderRoutes = require("./routes/orders");
const orderBackupRoutes = require("./routes/orderBackups");
const cartRoutes = require("./routes/carts");
const subcriptionRoutes = require("./routes/subscriptions");
const wholesaleRoutes = require("./routes/wholesales");
// const { celebrateCreateUser, celebrateLoginUser } = require('./validators/users');
const NotFoundError = require("./errors/NotFoundError");
const { requestLogger, errorLogger } = require("./middlewares/logger");
const errorHandler = require("./middlewares/errorHandler");
const rateLimiter = require("./middlewares/rateLimit");
const { createProxyMiddleware } = require("http-proxy-middleware");
const fs = require('fs');

const { PORT = 3001 } = process.env;

const app = express();

app.use(bodyParser.json());

app.use(
  cors({
    origin: "*",
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// app.use((req, res, next) => {
//   res.header({ "Access-Control-Allow-Origin": "*" });
//   next();
// });

// const config = dotenv.config({
//   path: path
//     .resolve(process.env.NODE_ENV === 'production' ? '.env' : '.env.common'),
// })
//   .parsed;

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

const apiProxyOther = createProxyMiddleware("/api-other", proxyOptionsDeliver);

const proxyOptionsStatus = {
  target: 'https://payment.alfabank.ru/payment/rest/getOrderStatus.do',
  changeOrigin: true,
  pathRewrite: {
    "^/api-status": "",
  },
};

const apiProxyStatus = createProxyMiddleware("/api-status", proxyOptionsStatus)

const proxyOptionsPay = {
  target: 'https://payment.alfabank.ru/payment/rest/register.do',
  // target: "https://alfa.rbsuat.com/payment/rest/register.do",
  changeOrigin: true,
  pathRewrite: {
    "^/api-pay": "",
  },
};

const apiProxy = createProxyMiddleware("/api-pay", proxyOptionsPay);

app.use("/api-deliver", apiProxyOther);

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

app.use("/service.php", (req, res) => {
  const filePath = path.join(__dirname, "service.php");

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Internal Server Error');
    }

    res.set('Content-Type', 'text/plain');
    res.send(data);
  });
});

// app.use("/service.php", (req, res) => {
//   // Ваша логика обработки запросов к service.php
//   res.sendFile(path.join(__dirname, "service.php"));
// });

app.use((req, res, next) => next(new NotFoundError("Страница не найдена")));
app.use(errorLogger);
app.use(errors());
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});
