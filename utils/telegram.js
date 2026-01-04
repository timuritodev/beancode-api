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
		// Проверяем что сообщение не пустое
		if (
			!message ||
			typeof message !== 'string' ||
			message.trim().length === 0
		) {
			return reject(new Error('Message is empty or invalid'));
		}

		// Убираем лишние пробелы и переносы строк
		const cleanMessage = message.trim().replace(/\n{3,}/g, '\n\n');

		// Проверяем что после удаления HTML тегов остается текст
		const textWithoutHtml = cleanMessage.replace(/<[^>]*>/g, '').trim();
		if (textWithoutHtml.length === 0) {
			console.error('⚠️  Message contains only HTML tags, no text content');
			return reject(
				new Error('Message contains only HTML tags, no text content')
			);
		}

		// Убеждаемся что chatId это число или строка
		const chatIdNum =
			typeof chatId === 'string' && /^-?\d+$/.test(chatId)
				? parseInt(chatId, 10)
				: chatId;

		const payload = {
			chat_id: chatIdNum,
			text: cleanMessage,
			parse_mode: 'HTML',
		};

		const data = JSON.stringify(payload, null, 0);

		console.log('📨 Telegram payload:', {
			chatId: chatId,
			messageLength: cleanMessage.length,
			textWithoutHtmlLength: textWithoutHtml.length,
			messagePreview: cleanMessage.substring(0, 150),
		});

		const options = {
			hostname: 'api.telegram.org',
			path: `/bot${botToken}/sendMessage`,
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': Buffer.byteLength(data, 'utf8'),
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
					console.error('❌ Telegram API error:', {
						statusCode: res.statusCode,
						response: responseData,
						messageLength: cleanMessage.length,
						messagePreview: cleanMessage.substring(0, 200),
					});
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
	if (!order) {
		console.error('⚠️  formatOrderNotification: order is null or undefined');
		return '🆕 <b>Новый заказ</b>\n\n⚠️ Данные заказа недоступны';
	}

	const statusEmoji = order.status === 'sent' ? '✅' : '⏳';
	const message = `
🆕 <b>Новый заказ</b>

📦 <b>Номер заказа:</b> ${order.orderNumber || 'не указан'}
👤 <b>Клиент:</b> ${order.email || 'не указан'}
📞 <b>Телефон:</b> ${order.phone || 'не указан'}
📍 <b>Адрес:</b> ${order.city || ''}, ${order.address || ''}
💰 <b>Сумма:</b> ${order.sum || 0} ₽
📊 <b>Товары:</b> ${order.products_info || 'не указано'}
📦 <b>Количество:</b> ${order.product_quantity || 0}
📅 <b>Дата:</b> ${order.date_order || 'не указана'}
${statusEmoji} <b>Статус:</b> ${order.status || 'не отправлен'}

<i>ID заказа: ${order.id || 'не указан'}</i>
	`.trim();

	if (!message || message.length === 0) {
		console.error('⚠️  formatOrderNotification: message is empty');
		return '🆕 <b>Новый заказ</b>\n\n⚠️ Не удалось сформировать сообщение';
	}

	return message;
};

module.exports = {
	sendTelegramNotification,
	formatOrderNotification,
};
