const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const url = require('url');
const querystring = require('querystring');
const orderModel = require('../models/order');
const { findUserByEmail } = require('../models/user');
const promoModel = require('../models/promo');
const cartModel = require('../models/cart');
const sessionCartModel = require('../models/session_cart');
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
	const requestStartTime = new Date().toISOString();
	console.log(
		'═══════════════════════════════════════════════════════════════'
	);
	console.log(`🔔 WEBHOOK REQUEST RECEIVED at ${requestStartTime}`);
	console.log(`   Method: ${req.method}`);
	console.log(`   URL: ${req.originalUrl || req.url}`);
	console.log(`   Path: ${req.path}`);
	console.log(`   Headers:`, JSON.stringify(req.headers, null, 2));
	console.log(`   Query params:`, JSON.stringify(req.query, null, 2));
	console.log(`   Body:`, JSON.stringify(req.body, null, 2));
	console.log(`   Raw body:`, req.body);
	console.log(
		'───────────────────────────────────────────────────────────────'
	);

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

		console.log('📦 EXTRACTED PARAMETERS:');
		console.log('   orderNumber:', orderNumber);
		console.log('   mdOrder:', mdOrder);
		console.log('   operation:', operation);
		console.log('   status:', status);
		console.log(
			'   checksum:',
			checksum ? `${checksum.substring(0, 10)}...` : 'MISSING'
		);
		console.log('   orderDescription (raw):', orderDescriptionRaw);
		console.log('   orderDescription (decoded):', orderDescription);
		console.log('   amount:', amount);
		console.log('   date (raw):', dateRaw);
		console.log('   date (decoded):', date);
		console.log('   alfaPayOwnCard:', alfaPayOwnCard);
		console.log(
			'───────────────────────────────────────────────────────────────'
		);

		// Проверяем обязательные параметры
		if (!orderNumber || !operation || status === undefined) {
			console.error(
				'❌ VALIDATION FAILED: Missing required callback parameters'
			);
			console.error('   orderNumber:', orderNumber || 'MISSING');
			console.error('   operation:', operation || 'MISSING');
			console.error('   status:', status === undefined ? 'MISSING' : status);
			const errorResponse = 'Missing required parameters';
			console.log(`   → Returning 400: ${errorResponse}`);
			return res.status(400).send(errorResponse);
		}

		console.log('✅ Required parameters check passed');

		// Проверяем подпись (checksum) для безопасности - симметричная подпись (HMAC)
		console.log('🔐 Starting signature verification...');

		if (!checksum) {
			console.error(
				'❌ SIGNATURE CHECK FAILED: Callback received without checksum'
			);
			const errorResponse = 'Missing checksum';
			console.log(`   → Returning 400: ${errorResponse}`);
			return res.status(400).send(errorResponse);
		}

		const callbackToken = process.env.CALLBACK_TOKEN;

		if (!callbackToken) {
			console.error(
				'❌ SIGNATURE CHECK FAILED: CALLBACK_TOKEN not configured, cannot verify signature'
			);
			const errorResponse = 'Signature verification failed';
			console.log(`   → Returning 400: ${errorResponse}`);
			return res.status(400).send(errorResponse);
		}

		console.log('   CALLBACK_TOKEN configured:', callbackToken ? 'YES' : 'NO');

		// Получаем параметры в оригинальном виде (encoded) из URL для проверки подписи
		// Express автоматически декодирует query параметры, поэтому парсим URL вручную
		console.log('📋 Collecting parameters for signature verification...');
		let allParamsForSignature = {};

		// Для GET запросов получаем параметры из URL (encoded)
		if (req.method === 'GET' && req.originalUrl) {
			console.log('   Method: GET, parsing from URL');
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
			console.log('   Method: POST, collecting from URL and body');
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
			console.log('   No params from URL, using query + body fallback');
			allParamsForSignature = {
				...(req.query || {}),
				...(req.body || {}),
			};
		}

		console.log(
			`   Collected ${
				Object.keys(allParamsForSignature).length
			} parameters for signature`
		);
		console.log(
			'   Parameters:',
			Object.keys(allParamsForSignature).join(', ')
		);

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

		console.log(
			'   Preparing signature verification (encoded and decoded variants)...'
		);

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

			console.log(`   [${variantName}]`);
			console.log(`     Data string length: ${dataString.length}`);
			console.log(`     Calculated: ${calculatedChecksum.substring(0, 16)}...`);
			console.log(
				`     Received:   ${receivedChecksumUpper.substring(0, 16)}...`
			);

			return {
				isValid: calculatedChecksum === receivedChecksumUpper,
				variant: variantName,
				calculated: calculatedChecksum,
				received: receivedChecksumUpper,
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
			console.error('   Encoded variant valid:', resultEncoded.isValid);
			console.error('   Decoded variant valid:', resultDecoded.isValid);
			const errorResponse = 'Invalid signature';
			console.log(`   → Returning 400: ${errorResponse}`);
			return res.status(400).send(errorResponse);
		}

		console.log(`✅ Signature verified successfully (${matchedVariant})`);
		console.log(
			'───────────────────────────────────────────────────────────────'
		);

		// Обрабатываем только успешное списание средств
		console.log(`🔄 Processing operation: ${operation}, status: ${status}`);
		if (operation === 'deposited' && status === '1') {
			console.log('✅ Processing successful payment (deposited with status 1)');
			// Проверяем, не создан ли уже заказ (чтобы избежать дублирования)
			console.log(
				`   Checking for existing order with orderNumber: ${orderNumber}`
			);
			const existingOrder = await orderModel.getOrderByOrderNumber(orderNumber);

			if (existingOrder) {
				console.log(
					`⚠️  Order with orderNumber ${orderNumber} already exists (ID: ${existingOrder.id})`
				);
				console.log(`   → Returning 200: OK (duplicate ignored)`);
				const response = 'OK';
				res.status(200).send(response);
				console.log(`✅ Response sent: ${response}`);
				console.log(
					'═══════════════════════════════════════════════════════════════'
				);
				return;
			}

			console.log('   No existing order found, creating new order...');

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
			console.log('📝 Parsing order data from orderDescription...');
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
				console.log(
					`   orderDescription length: ${orderDescription.length} chars`
				);
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
				const promoMatch = orderDescription.match(/Промокод - ([^,]+)/);
				const sessionIdMatch = orderDescription.match(/SessionId - ([^,]+)/);

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
				parsedData.promoCode = promoMatch ? promoMatch[1].trim() : null;
				parsedData.sessionId = sessionIdMatch ? sessionIdMatch[1].trim() : null;

				console.log('   SessionId parsing:');
				console.log(
					'     sessionIdMatch:',
					sessionIdMatch ? sessionIdMatch[1] : 'NOT FOUND'
				);
				console.log(
					'     parsedData.sessionId:',
					parsedData.sessionId || 'NULL'
				);

				console.log('   Parsed values:');
				console.log('     city:', parsedData.city || 'NOT FOUND');
				console.log('     address:', parsedData.address || 'NOT FOUND');
				console.log('     email:', parsedData.email || 'NOT FOUND');
				console.log('     phone:', parsedData.phone || 'NOT FOUND');
				console.log(
					'     products_info:',
					parsedData.products_info
						? `${parsedData.products_info.substring(0, 50)}...`
						: 'NOT FOUND'
				);
				console.log('     product_quantity:', parsedData.product_quantity);
			} else {
				console.warn('   ⚠️  No orderDescription provided');
			}

			// Используем amount из callback (в копейках, переводим в рубли)
			if (amount) {
				parsedData.sum = parseInt(amount, 10) / 100;
				console.log(`   Amount: ${amount} kopecks = ${parsedData.sum} rubles`);
			} else {
				console.warn('   ⚠️  No amount provided');
			}

			// Проверяем, что все необходимые данные есть
			console.log('🔍 Validating parsed data...');
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
			console.log(`🔍 Looking up user by email: ${parsedData.email}`);
			const user = await findUserByEmail(parsedData.email);
			if (user) {
				parsedData.userId = user.id;
				console.log(`   ✅ User found: ID ${user.id}`);
			} else {
				console.warn(
					`   ⚠️  User not found by email: ${parsedData.email}, using userId: 0`
				);
			}

			// Создаем основной заказ
			console.log('💾 Creating order in database...');
			console.log('   Order data:', JSON.stringify(parsedData, null, 2));
			const orderId = await orderModel.createOrder(parsedData);
			console.log(
				`✅ Order created successfully with ID: ${orderId} for orderNumber: ${orderNumber}`
			);

			// Обрабатываем промокод (если был использован)
			if (parsedData.promoCode) {
				try {
					console.log(`🎟️  Processing promo code: ${parsedData.promoCode}`);
					const promoCodeData = await promoModel.findPromoCodeByCode(
						parsedData.promoCode
					);
					if (promoCodeData && parsedData.userId > 0) {
						// Проверяем, не использован ли уже промокод
						const isPromoCodeUsed = await promoModel.isPromoCodeAlreadyUsed(
							parsedData.userId,
							promoCodeData.id
						);
						if (!isPromoCodeUsed) {
							// Записываем использование промокода только после успешной оплаты
							await promoModel.recordPromoCodeUsage(
								parsedData.userId,
								promoCodeData.id
							);
							console.log(
								`   ✅ Promo code ${parsedData.promoCode} marked as used`
							);
						} else {
							console.log(
								`   ⚠️  Promo code ${parsedData.promoCode} already used`
							);
						}
					} else if (!promoCodeData) {
						console.log(`   ⚠️  Promo code ${parsedData.promoCode} not found`);
					}

					// Удаляем примененный промокод из applied_promo_codes после успешной оплаты
					if (parsedData.userId > 0) {
						await promoModel.removeAppliedPromoCode(parsedData.userId);
						console.log(`   ✅ Applied promo code removed from database`);
					}
				} catch (error) {
					console.error('   ❌ Error processing promo code:', error);
					// Не прерываем выполнение, если промокод не обработался
				}
			}

			// Удаляем корзину после успешной оплаты
			console.log('🛒 Cart clearing logic:');
			console.log('   parsedData.userId:', parsedData.userId);
			console.log('   parsedData.sessionId:', parsedData.sessionId || 'NULL');

			if (parsedData.userId > 0) {
				// Для авторизованных пользователей - удаляем обычную корзину
				try {
					console.log(`🛒 Clearing cart for user ID: ${parsedData.userId}`);
					const result = await cartModel.clearCartByUserId(parsedData.userId);
					console.log(`   ✅ Cart cleared successfully, result:`, result);
				} catch (error) {
					console.error('   ❌ Error clearing cart:', error);
					// Не прерываем выполнение, если корзина не очистилась
				}
			} else if (parsedData.sessionId) {
				// Для неавторизованных пользователей - удаляем сессионную корзину
				try {
					console.log(
						`🛒 Clearing session cart for session ID: ${parsedData.sessionId}`
					);
					const result = await sessionCartModel.clearSessionCartByUserId(
						parsedData.sessionId
					);
					console.log(
						`   ✅ Session cart cleared successfully, result:`,
						result
					);
				} catch (error) {
					console.error('   ❌ Error clearing session cart:', error);
					console.error('   Error details:', error.message, error.stack);
					// Не прерываем выполнение, если корзина не очистилась
				}
			} else {
				console.warn(
					'   ⚠️  No userId and no sessionId - cart will not be cleared'
				);
			}

			// Отправляем уведомление в Telegram (если настроено)
			const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
			const telegramChatId = process.env.TELEGRAM_CHAT_ID;

			if (telegramBotToken && telegramChatId) {
				console.log('📤 Sending Telegram notification...');
				try {
					const order = await orderModel.getOrderById(orderId);
					if (order) {
						const message = formatOrderNotification(order);
						if (message && message.trim().length > 0) {
							await sendTelegramNotification(
								telegramBotToken,
								telegramChatId,
								message
							);
							console.log('   ✅ Telegram notification sent successfully');
						} else {
							console.warn('   ⚠️  Telegram message is empty, skipping');
						}
					} else {
						console.warn(
							'   ⚠️  Order not found after creation, skipping Telegram notification'
						);
					}
				} catch (error) {
					console.error(
						'   ❌ Failed to send Telegram notification:',
						error.message
					);
					console.error('   Stack:', error.stack);
					// Не прерываем выполнение, если уведомление не отправилось
				}
			} else {
				console.log(
					'   ℹ️  Telegram notifications not configured (missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID)'
				);
			}

			// Возвращаем успешный ответ шлюзу
			console.log(
				'───────────────────────────────────────────────────────────────'
			);
			const response = 'OK';
			console.log(`✅ Processing completed successfully`);
			console.log(`   → Returning 200: ${response}`);
			res.status(200).send(response);
			console.log(
				'═══════════════════════════════════════════════════════════════'
			);
			return;
		} else {
			// Для других операций просто логируем и возвращаем OK
			console.log(
				`ℹ️  Callback received for operation: ${operation}, status: ${status} - no action needed`
			);
			console.log(
				'───────────────────────────────────────────────────────────────'
			);
			const response = 'OK';
			console.log(`   → Returning 200: ${response}`);
			res.status(200).send(response);
			console.log(
				'═══════════════════════════════════════════════════════════════'
			);
			return;
		}
	} catch (error) {
		console.error(
			'───────────────────────────────────────────────────────────────'
		);
		console.error('❌ ERROR PROCESSING CALLBACK:');
		console.error('   Error message:', error.message);
		console.error('   Error stack:', error.stack);
		console.error('   Error details:', error);
		// Все равно возвращаем 200, чтобы шлюз не повторял запрос
		const response = 'OK';
		console.log(`   → Returning 200: ${response} (to prevent retries)`);
		res.status(200).send(response);
		console.log(
			'═══════════════════════════════════════════════════════════════'
		);
		return;
	}
};

// Поддерживаем оба метода для надежности
router.get('/api/payment/callback', handleCallback);
router.post('/api/payment/callback', handleCallback);

module.exports = router;
