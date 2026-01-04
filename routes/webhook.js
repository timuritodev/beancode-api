const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const url = require('url');
const querystring = require('querystring');
const orderModel = require('../models/order');
const { findUserByEmail } = require('../models/user');
const {
	sendTelegramNotification,
	formatOrderNotification,
} = require('../utils/telegram');

const router = express.Router();

// Применяем urlencoded парсер только для вебхука
router.use(bodyParser.urlencoded({ extended: true }));

// Обработка callback-уведомлений от платежного шлюза
// Поддерживаем как GET, так и POST запросы
const handleCallback = async (req, res) => {
	try {
		// Функция для декодирования URL-encoded строк
		// В URL + означает пробел, поэтому сначала заменяем + на %20, затем декодируем
		const decodeParam = (param) => {
			if (!param) return param;
			try {
				// Заменяем + на %20 перед декодированием
				const withSpaces = String(param).replace(/\+/g, '%20');
				return decodeURIComponent(withSpaces);
			} catch (e) {
				console.warn('Failed to decode param:', param, e);
				return param;
			}
		};

		// Получаем параметры из query (GET) или body (POST)
		const orderNumber = req.query.orderNumber || req.body.orderNumber;
		const mdOrder = req.query.mdOrder || req.body.mdOrder;
		const operation = req.query.operation || req.body.operation;
		const status = req.query.status || req.body.status;
		const checksum = req.query.checksum || req.body.checksum;

		// Дополнительные параметры из callback (декодируем URL-encoded значения)
		const orderDescriptionRaw =
			req.query.orderDescription || req.body.orderDescription;
		const orderDescription = decodeParam(orderDescriptionRaw);
		const amount = req.query.amount || req.body.amount;
		const dateRaw = req.query.date || req.body.date;
		const date = decodeParam(dateRaw);
		const alfaPayOwnCard = req.query.alfaPayOwnCard || req.body.alfaPayOwnCard;

		console.log('Callback received:', {
			orderNumber,
			mdOrder,
			operation,
			status,
		});

		// Проверяем обязательные параметры
		if (!orderNumber || !operation || status === undefined) {
			console.error('Missing required callback parameters');
			return res.status(400).send('Missing required parameters');
		}

		// Проверяем подпись (checksum) для безопасности - симметричная подпись (HMAC)

		if (!checksum) {
			console.error('❌ Callback received without checksum');
			return res.status(400).send('Missing checksum');
		}

		const callbackToken = process.env.CALLBACK_TOKEN;

		if (!callbackToken) {
			console.error(
				'❌ CALLBACK_TOKEN not configured, cannot verify signature'
			);
			return res.status(400).send('Signature verification failed');
		}

		// Получаем параметры в оригинальном виде (encoded) из URL для проверки подписи
		// Express автоматически декодирует query параметры, поэтому парсим URL вручную
		let allParamsForSignature = {};

		// Для GET запросов получаем параметры из URL (encoded)
		if (req.method === 'GET' && req.originalUrl) {
			const parsedUrl = url.parse(req.originalUrl, false);
			if (parsedUrl.query) {
				// Парсим query string вручную, сохраняя encoded значения
				parsedUrl.query.split('&').forEach((pair) => {
					const equalIndex = pair.indexOf('=');
					if (equalIndex > 0) {
						const key = decodeURIComponent(pair.substring(0, equalIndex));
						const value = pair.substring(equalIndex + 1); // Сохраняем значение как есть (encoded)
						allParamsForSignature[key] = value;
					}
				});
			}
		}

		// Для POST запросов параметры могут быть в body или query
		// Пробуем получить из URL если есть query параметры
		if (req.method === 'POST') {
			// Сначала пробуем получить из URL (если есть query параметры в URL)
			if (req.originalUrl && req.originalUrl.includes('?')) {
				const parsedUrl = url.parse(req.originalUrl, false);
				if (parsedUrl.query) {
					parsedUrl.query.split('&').forEach((pair) => {
						const equalIndex = pair.indexOf('=');
						if (equalIndex > 0) {
							const key = decodeURIComponent(pair.substring(0, equalIndex));
							const value = pair.substring(equalIndex + 1);
							allParamsForSignature[key] = value;
						}
					});
				}
			}

			// Добавляем параметры из body (они уже декодированы bodyParser)
			// Для POST body параметры уже декодированы, но платежный шлюз может формировать подпись от них
			if (req.body && Object.keys(req.body).length > 0) {
				allParamsForSignature = { ...allParamsForSignature, ...req.body };
			}

			// Добавляем параметры из query если есть
			if (req.query && Object.keys(req.query).length > 0) {
				allParamsForSignature = { ...allParamsForSignature, ...req.query };
			}
		}

		// Если не удалось получить из URL, используем req.query и req.body как fallback
		if (Object.keys(allParamsForSignature).length === 0) {
			allParamsForSignature = {
				...(req.query || {}),
				...(req.body || {}),
			};
		}

		// Убеждаемся, что все дополнительные параметры включены
		// (на случай, если они не попали в allParamsForSignature)
		if (orderDescriptionRaw && !allParamsForSignature.orderDescription) {
			allParamsForSignature.orderDescription = orderDescriptionRaw;
		}
		if (amount && !allParamsForSignature.amount) {
			allParamsForSignature.amount = amount;
		}
		if (dateRaw && !allParamsForSignature.date) {
			allParamsForSignature.date = dateRaw;
		}
		if (alfaPayOwnCard && !allParamsForSignature.alfaPayOwnCard) {
			allParamsForSignature.alfaPayOwnCard = alfaPayOwnCard;
		}

		// Удаляем checksum и sign_alias из параметров для проверки
		delete allParamsForSignature.checksum;
		delete allParamsForSignature.sign_alias;

		// Создаем два варианта параметров для проверки:
		// 1. allParamsEncoded - параметры как есть (encoded, если были в URL)
		// 2. allParamsDecoded - все параметры полностью декодированы
		const allParamsEncoded = { ...allParamsForSignature };
		const allParamsDecoded = {};
		for (const key in allParamsForSignature) {
			allParamsDecoded[key] = decodeParam(allParamsForSignature[key]);
		}

		// Функция для проверки подписи
		const checkSignature = (params, variantName) => {
			const sortedKeys = Object.keys(params).sort();
			const dataString = sortedKeys
				.map((key) => `${key};${params[key] || ''};`)
				.join('');
			const calculatedChecksum = crypto
				.createHmac('sha256', callbackToken)
				.update(dataString)
				.digest('hex')
				.toUpperCase();
			const receivedChecksumUpper = checksum ? checksum.toUpperCase() : '';

			return {
				isValid: calculatedChecksum === receivedChecksumUpper,
				variant: variantName,
			};
		};

		// Проверяем оба варианта
		const resultEncoded = checkSignature(
			allParamsEncoded,
			'Encoded (as received)'
		);
		const resultDecoded = checkSignature(
			allParamsDecoded,
			'Decoded (fully decoded)'
		);

		const isValid = resultEncoded.isValid || resultDecoded.isValid;
		const matchedVariant = resultEncoded.isValid
			? resultEncoded.variant
			: resultDecoded.isValid
			? resultDecoded.variant
			: null;

		// Для дальнейшей обработки декодируем параметры
		const allParams = {};
		for (const key in allParamsForSignature) {
			allParams[key] = decodeParam(allParamsForSignature[key]);
		}

		if (!isValid) {
			console.error('❌ SIGNATURE VERIFICATION FAILED');
			return res.status(400).send('Invalid signature');
		}

		console.log(`✅ Signature verified (${matchedVariant})`);

		// Обрабатываем только успешное списание средств
		if (operation === 'deposited' && status === '1') {
			// Проверяем, не создан ли уже заказ (чтобы избежать дублирования)
			const existingOrder = await orderModel.getOrderByOrderNumber(orderNumber);

			if (existingOrder) {
				console.log(`Order with orderNumber ${orderNumber} already exists`);
				return res.status(200).send('OK');
			}

			// Функция для преобразования даты из формата DD.MM.YYYY HH:MM:SS в YYYY-MM-DD HH:MM:SS
			const formatDateForMySQL = (dateStr) => {
				if (!dateStr) {
					return new Date().toISOString().split('T')[0];
				}
				// Формат: "03.01.2026 19:12:47" -> "2026-01-03 19:12:47"
				const match = dateStr.match(
					/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/
				);
				if (match) {
					const [, day, month, year, hour, minute, second] = match;
					return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
				}
				// Если формат не совпадает, возвращаем текущую дату
				console.warn(
					`⚠️  Unexpected date format: ${dateStr}, using current date`
				);
				return new Date().toISOString().split('T')[0];
			};

			// Парсим orderDescription для извлечения данных заказа
			// Формат: "Номер заказа - X, Информация о заказе(id, название, вес) - Y, Кол-во товаров - Z, Город - CITY, Адрес - ADDRESS, Email - EMAIL, Телефон - PHONE, ФИО - NAME"
			let parsedData = {
				userId: 0,
				phone: '',
				email: '',
				address: '',
				city: '',
				sum: 0,
				product_quantity: 0,
				products_info: '',
				orderNumber: orderNumber,
				date_order: formatDateForMySQL(date),
			};

			if (orderDescription) {
				// Извлекаем данные из orderDescription
				const cityMatch = orderDescription.match(/Город - ([^,]+)/);
				const addressMatch = orderDescription.match(/Адрес - ([^,]+)/);
				const productsInfoMatch = orderDescription.match(
					/Информация о заказе\(id, название, вес\) - ([^,]+)/
				);
				const quantityMatch = orderDescription.match(/Кол-во товаров - (\d+)/);
				const emailMatch = orderDescription.match(/Email - ([^,]+)/);
				const phoneMatch = orderDescription.match(/Телефон - ([^,]+)/);
				const fioMatch = orderDescription.match(/ФИО - (.+?)(?:,|$)/);

				parsedData.city = cityMatch ? cityMatch[1].trim() : '';
				parsedData.address = addressMatch ? addressMatch[1].trim() : '';
				parsedData.products_info = productsInfoMatch
					? productsInfoMatch[1].trim()
					: '';
				parsedData.product_quantity = quantityMatch
					? parseInt(quantityMatch[1], 10)
					: 0;
				parsedData.email = emailMatch ? emailMatch[1].trim() : '';
				parsedData.phone = phoneMatch ? phoneMatch[1].trim() : '';
			}

			// Используем amount из callback (в копейках, переводим в рубли)
			if (amount) {
				parsedData.sum = parseInt(amount, 10) / 100;
			}

			// Проверяем, что все необходимые данные есть
			if (
				!parsedData.email ||
				!parsedData.phone ||
				!parsedData.sum ||
				!parsedData.city ||
				!parsedData.address
			) {
				console.error('❌ Insufficient data from callback:');
				console.error('  email:', parsedData.email || 'MISSING');
				console.error('  phone:', parsedData.phone || 'MISSING');
				console.error('  sum:', parsedData.sum || 'MISSING');
				console.error('  city:', parsedData.city || 'MISSING');
				console.error('  address:', parsedData.address || 'MISSING');
				console.error('  orderDescription:', orderDescription || 'MISSING');
				return res.status(400).send('Insufficient data in callback');
			}

			// Находим пользователя по email
			const user = await findUserByEmail(parsedData.email);
			if (user) {
				parsedData.userId = user.id;
			} else {
				console.warn(
					`⚠️  User not found by email: ${parsedData.email}, using userId: 0`
				);
			}

			// Создаем основной заказ
			const orderId = await orderModel.createOrder(parsedData);
			console.log(
				`✅ Order created successfully with ID: ${orderId} for orderNumber: ${orderNumber}`
			);

			// Отправляем уведомление в Telegram (если настроено)
			const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
			const telegramChatId = process.env.TELEGRAM_CHAT_ID;

			console.log('🔍 Telegram config check:', {
				hasToken: !!telegramBotToken,
				hasChatId: !!telegramChatId,
				chatId: telegramChatId,
			});

			if (telegramBotToken && telegramChatId) {
				try {
					const order = await orderModel.getOrderById(orderId);
					if (order) {
						console.log('📋 Order data for notification:', {
							id: order.id,
							orderNumber: order.orderNumber,
							email: order.email,
							hasProductsInfo: !!order.products_info,
						});

						const message = formatOrderNotification(order);

						if (!message || message.trim().length === 0) {
							console.error('⚠️  Message is empty, cannot send notification');
							return res.status(200).send('OK');
						}

						console.log(
							'📤 Sending Telegram notification, message length:',
							message.length
						);
						await sendTelegramNotification(
							telegramBotToken,
							telegramChatId,
							message
						);
						console.log('📱 Telegram notification sent successfully');
					} else {
						console.warn(
							'⚠️  Order not found for notification, orderId:',
							orderId
						);
					}
				} catch (error) {
					console.error(
						'⚠️  Failed to send Telegram notification:',
						error.message,
						error.stack
					);
					// Не прерываем выполнение, если уведомление не отправилось
				}
			} else {
				console.warn(
					'⚠️  Telegram notification skipped: missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID'
				);
			}

			// Возвращаем успешный ответ шлюзу
			return res.status(200).send('OK');
		} else {
			// Для других операций просто логируем и возвращаем OK
			console.log(
				`Callback received for operation: ${operation}, status: ${status} - no action needed`
			);
			return res.status(200).send('OK');
		}
	} catch (error) {
		console.error('Error processing callback:', error);
		// Все равно возвращаем 200, чтобы шлюз не повторял запрос
		return res.status(200).send('OK');
	}
};

// Поддерживаем оба метода для надежности
router.get('/api/payment/callback', handleCallback);
router.post('/api/payment/callback', handleCallback);

module.exports = router;
