// Используем встроенный https модуль вместо axios
const https = require('https');

/**
 * Отправка уведомления в Telegram бот
 * @param {string} botToken - Токен бота от BotFather
 * @param {number|string} chatId - ID чата (можно получить у @userinfobot)
 * @param {string} message - Текст сообщения
 */
const sendTelegramNotification = async (botToken, chatId, message) => {
	return new Promise((resolve, reject) => {
		const data = JSON.stringify({
			chat_id: chatId,
			text: message,
			parse_mode: 'HTML',
		});

		const options = {
			hostname: 'api.telegram.org',
			path: `/bot${botToken}/sendMessage`,
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': data.length,
			},
		};

		const req = https.request(options, (res) => {
			let responseData = '';

			res.on('data', (chunk) => {
				responseData += chunk;
			});

			res.on('end', () => {
				if (res.statusCode === 200) {
					resolve(JSON.parse(responseData));
				} else {
					reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
				}
			});
		});

		req.on('error', (error) => {
			reject(error);
		});

		req.write(data);
		req.end();
	});
};

/**
 * Форматирование сообщения о новом заказе
 */
const formatOrderNotification = (order) => {
	const statusEmoji = order.status === 'sent' ? '✅' : '⏳';
	return `
🆕 <b>Новый заказ</b>

📦 <b>Номер заказа:</b> ${order.orderNumber}
👤 <b>Клиент:</b> ${order.email}
📞 <b>Телефон:</b> ${order.phone}
📍 <b>Адрес:</b> ${order.city}, ${order.address}
💰 <b>Сумма:</b> ${order.sum} ₽
📊 <b>Товары:</b> ${order.products_info}
📦 <b>Количество:</b> ${order.product_quantity}
📅 <b>Дата:</b> ${order.date_order}
${statusEmoji} <b>Статус:</b> ${order.status || 'не отправлен'}

<i>ID заказа: ${order.id}</i>
	`.trim();
};

module.exports = {
	sendTelegramNotification,
	formatOrderNotification,
};

