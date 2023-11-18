require('dotenv').config();
const nodemailer = require('nodemailer');

const sendEmail = async (req, res, next) => {
  try {
    const { from, subject, text } = req.body;

    // Создание транспорта для отправки писем
    const transporter = nodemailer.createTransport({
      // host: '31.31.196.190',
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
        console.error('Ошибка проверки подключения: ', error);
        res.status(500).json({ success: false, message: 'Ошибка при проверке подключения' });
      } else {
        console.log('Соединение установлено успешно');

        // Настройка письма
        const mailOptions = {
          from: from,
          to: 'your_email@example.com',
          subject: subject,
          text: text,
        };

        // Отправка письма
        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.error('Ошибка отправки письма: ', error);
            res.status(500).json({ success: false, message: 'Произошла ошибка при отправке письма' });
          } else {
            console.log('Письмо отправлено: ', info.messageId);
            res.json({ success: true, message: 'Письмо успешно отправлено' });
          }
        });
      }
    });
  } catch (error) {
    console.error('Общая ошибка: ', error);
    res.status(500).json({ success: false, message: 'Произошла общая ошибка' });
  }
};

module.exports = {
  sendEmail
};
