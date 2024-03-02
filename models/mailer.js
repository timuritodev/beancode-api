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

const sendEmail = async ({ from, subject, text }) => {
  try {
    // Создание транспорта для отправки писем
    const transporter = nodemailer.createTransport({
      host: process.env.HOST,
      port: 587,
      secure: false,
      auth: {
        user: process.env.MAIL,
        pass: process.env.PASS,
      },
    });

    // Проверка подключения
    transporter.verify(function (error, success) {
      if (error) {
        console.error("Ошибка проверки подключения: ", error);
        // Вызываем ошибку, чтобы ее обработать в блоке catch
        throw new Error("Ошибка при проверке подключения");
      } else {
        console.log("Соединение установлено успешно");

        // Настройка письма
        const mailOptions = {
          from: from,
          to: process.env.MAIL,
          subject: subject,
          text: text,
        };

        // Отправка письма
        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.error("Ошибка отправки письма: ", error);
            // Вызываем ошибку, чтобы ее обработать в блоке catch
            throw new Error("Произошла ошибка при отправке письма");
          } else {
            console.log("Письмо отправлено: ", info.messageId);
          }
        });
      }
    });
  } catch (error) {
    console.error("Общая ошибка: ", error);
    // Вызываем ошибку, чтобы ее обработать в блоке catch
    throw new Error("Произошла общая ошибка");
  }
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
};
