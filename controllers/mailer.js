require('dotenv').config();
const nodemailer = require('nodemailer');
const { Mailer } = require('../models/mailer');

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

module.exports.sendEmail = async (req, res) => {
  try {
    const {
      fio, telephone, email, message, items,
    } = req.body;

    const newMail = new Mailer({
      fio,
      telephone,
      email,
      message,
      items,
    });
    await newMail.save();

    const mailOptions = {
      from: 'nemernyimetall@gmail.com',
      to: 'nemernyimetall@gmail.com',
      subject: 'Message from the website',
      text: `Name: ${fio}\nTelephone: ${telephone}\nEmail: ${email}\nMessage: ${message}\nItems:\n${items}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ error: 'An error occurred while sending the email' });
      } else {
        console.log('Email sent successfully:', info.response);
        res.status(200).json({ message: 'Email sent successfully' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
};
