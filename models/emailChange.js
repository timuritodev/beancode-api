const { pool } = require('../utils/utils');
const crypto = require('crypto');

// Таблица для подтверждения смены email кодом.
// create table email_change(
//     id int auto_increment primary key,
//     user_id int not null,
//     new_email varchar(255) not null,
//     code varchar(10) not null,
//     expiration_time varchar(100) not null
//     );

/** Генерирует 6-значный код подтверждения. */
const generateCode = () => {
	return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
};

/**
 * Сохраняет заявку на смену email. На пользователя держим только одну активную
 * заявку — старую удаляем перед вставкой новой.
 */
const saveEmailChangeCode = async (userId, newEmail, code, expirationTime) => {
	try {
		await pool.execute(`DELETE FROM email_change WHERE user_id = ?`, [userId]);
		await pool.execute(
			`
        INSERT INTO email_change (user_id, new_email, code, expiration_time)
        VALUES (?, ?, ?, ?)
      `,
			[userId, newEmail, code, new Date(expirationTime).toISOString()]
		);
	} catch (error) {
		console.error('Error in saveEmailChangeCode:', error);
		throw error;
	}
};

/**
 * Возвращает активную заявку по пользователю и коду или null.
 * @returns {Promise<{ newEmail: string, expirationTime: string } | null>}
 */
const getEmailChangeByCode = async (userId, code) => {
	try {
		const [rows] = await pool.execute(
			`
        SELECT new_email, expiration_time
        FROM email_change
        WHERE user_id = ? AND code = ?
      `,
			[userId, code]
		);

		if (rows.length === 0) return null;

		return {
			newEmail: rows[0].new_email,
			expirationTime: new Date(rows[0].expiration_time).toISOString(),
		};
	} catch (error) {
		console.error('Error in getEmailChangeByCode:', error);
		throw error;
	}
};

const removeEmailChange = async (userId) => {
	try {
		await pool.execute(`DELETE FROM email_change WHERE user_id = ?`, [userId]);
	} catch (error) {
		console.error('Error in removeEmailChange:', error);
		throw error;
	}
};

module.exports = {
	generateCode,
	saveEmailChangeCode,
	getEmailChangeByCode,
	removeEmailChange,
};
