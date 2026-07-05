const express = require('express');
const jwt = require('jsonwebtoken');
const authEmailChange = require('../middlewares/authEmailChange');
const { findUserByEmail, findUserById, updateUserEmail } = require('../models/user');
const {
	generateCode,
	saveEmailChangeCode,
	getEmailChangeByCode,
	removeEmailChange,
} = require('../models/emailChange');
const { sendEmailChangeCode } = require('../models/mailer');
const { checkRuEmailDomain, RU_EMAIL_ERROR_MESSAGE } = require('../utils/ruEmailDomain');

const router = express.Router();

// Шаг 1: пользователь вводит новый email — шлём на него код подтверждения.
router.post('/api/email-change/request', authEmailChange, async (req, res, next) => {
	try {
		const userId = req.user._id;
		const newEmail = (req.body.email || '').trim().toLowerCase();

		if (!checkRuEmailDomain(newEmail).ok) {
			return res.status(400).json({
				error: 'email_not_allowed',
				message: RU_EMAIL_ERROR_MESSAGE,
			});
		}

		// Новый адрес не должен быть занят другим пользователем.
		const existingUser = await findUserByEmail(newEmail);
		if (existingUser && String(existingUser.id) !== String(userId)) {
			return res.status(409).json({
				error: 'email_taken',
				message: 'Эта почта уже используется другим аккаунтом',
			});
		}

		const code = generateCode();
		const expirationTime = Date.now() + 3600000; // 1 час

		await saveEmailChangeCode(userId, newEmail, code, expirationTime);
		await sendEmailChangeCode(newEmail, code);

		res.json({ message: 'Код подтверждения отправлен на новую почту' });
	} catch (error) {
		next(error);
	}
});

// Шаг 2: пользователь вводит код — меняем email и выдаём обычный токен.
router.post('/api/email-change/confirm', authEmailChange, async (req, res, next) => {
	try {
		const userId = req.user._id;
		const { code } = req.body;

		if (!code) {
			return res.status(400).json({ error: 'code_required', message: 'Введите код' });
		}

		const pending = await getEmailChangeByCode(userId, String(code).trim());
		if (!pending || Date.now() > new Date(pending.expirationTime).getTime()) {
			return res.status(400).json({
				error: 'invalid_code',
				message: 'Неверный или просроченный код',
			});
		}

		// Перепроверяем на момент подтверждения: вдруг адрес уже заняли.
		if (!checkRuEmailDomain(pending.newEmail).ok) {
			return res.status(400).json({ error: 'email_not_allowed', message: RU_EMAIL_ERROR_MESSAGE });
		}
		const existingUser = await findUserByEmail(pending.newEmail);
		if (existingUser && String(existingUser.id) !== String(userId)) {
			return res.status(409).json({
				error: 'email_taken',
				message: 'Эта почта уже используется другим аккаунтом',
			});
		}

		await updateUserEmail(userId, pending.newEmail);
		await removeEmailChange(userId);

		// Выдаём полноценный токен — заблокированный при входе пользователь
		// теперь авторизован.
		const JWT_SALT = req.app.get('config').JWT_SALT;
		const token = jwt.sign({ _id: userId }, JWT_SALT, { expiresIn: '7d' });

		const user = await findUserById(userId);

		res.json({ message: 'Почта успешно изменена', token, email: pending.newEmail, user });
	} catch (error) {
		next(error);
	}
});

module.exports = router;
