require("dotenv").config();
const nodemailer = require("nodemailer");

const sendPasswordResetEmail = async (email, token) => {
  const transporter = nodemailer.createTransport({
    host: process.env.HOST,
    port: 587,
    secure: false,
    auth: {
      user: process.env.MAIL,
      pass: process.env.PASS,
    },
  });

  const resetLink = `https://beancode.ru/reset-password?token=${token}`;
  const mailOptions = {
    from: process.env.MAIL,
    to: email,
    subject: "Сброс Пароля",
    text: `Перейдите по следующей ссылке для сброса пароля: ${resetLink}`,
  };

  await transporter.sendMail(mailOptions);
};

const sendEmailChangeCode = async (email, code) => {
  const transporter = nodemailer.createTransport({
    host: process.env.HOST,
    port: 587,
    secure: false,
    auth: {
      user: process.env.MAIL,
      pass: process.env.PASS,
    },
  });

  const mailOptions = {
    from: process.env.MAIL,
    to: email,
    subject: "Подтверждение смены почты",
    text: `Ваш код для подтверждения новой электронной почты: ${code}\n\nКод действует 1 час. Если вы не запрашивали смену почты, проигнорируйте это письмо.`,
  };

  await transporter.sendMail(mailOptions);
};

const sendEmailInfo = async ({ email, subject, text }) => {
  const transporter = nodemailer.createTransport({
    host: process.env.HOST,
    port: 587,
    secure: false,
    auth: {
      user: process.env.MAIL,
      pass: process.env.PASS,
    },
  });

  const mailOptions = {
    from: email,
    to: process.env.MAIL,
    subject: subject,
    text: text,
  };

  await transporter.sendMail(mailOptions);
};

const sendOrderDetails = async ({ email, greetings }) => {
  const transporter = nodemailer.createTransport({
    host: process.env.HOST,
    port: 587,
    secure: false,
    auth: {
      user: process.env.MAIL,
      pass: process.env.PASS,
    },
  });

  const mailOptions = {
    from: process.env.MAIL,
    to: email,
    subject: "Детали заказа",
    text: greetings,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = {
  sendEmailInfo,
  sendPasswordResetEmail,
  sendEmailChangeCode,
  sendOrderDetails,
};
