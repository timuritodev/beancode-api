const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const orderModel = require('../models/order');
const orderBackupModel = require('../models/orderBackup');

const router = express.Router();

// Применяем urlencoded парсер только для вебхука
router.use(bodyParser.urlencoded({ extended: true }));

// Обработка callback-уведомлений от платежного шлюза
// Поддерживаем как GET, так и POST запросы
const handleCallback = async (req, res) => {
	try {
		// Получаем параметры из query (GET) или body (POST)
		const orderNumber = req.query.orderNumber || req.body.orderNumber;
		const mdOrder = req.query.mdOrder || req.body.mdOrder;
		const operation = req.query.operation || req.body.operation;
		const status = req.query.status || req.body.status;
		const checksum = req.query.checksum || req.body.checksum;

		// Дополнительные параметры из callback
		const orderDescription =
			req.query.orderDescription || req.body.orderDescription;
		const amount = req.query.amount || req.body.amount;
		const date = req.query.date || req.body.date;
		const alfaPayOwnCard = req.query.alfaPayOwnCard || req.body.alfaPayOwnCard;

		console.log('Callback received:', {
			orderNumber,
			mdOrder,
			operation,
			status,
			checksum,
			orderDescription,
			amount,
			date,
			alfaPayOwnCard,
		});

		// Логируем все дополнительные параметры
		console.log('📦 Additional callback parameters:');
		console.log('  orderDescription:', orderDescription);
		console.log('  amount:', amount);
		console.log('  date:', date);
		console.log('  alfaPayOwnCard:', alfaPayOwnCard);

		// Проверяем обязательные параметры
		if (!orderNumber || !operation || status === undefined) {
			console.error('Missing required callback parameters');
			return res.status(400).send('Missing required parameters');
		}

		// Проверяем подпись (checksum) для безопасности - симметричная подпись (HMAC)
		console.log('=== SIGNATURE VERIFICATION START ===');

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

		// Собираем все параметры из query и body
		const allParams = {
			...(req.query || {}),
			...(req.body || {}),
		};

		// Удаляем checksum и sign_alias из параметров для проверки
		delete allParams.checksum;
		delete allParams.sign_alias;

		console.log(
			'📋 All callback parameters (without checksum and sign_alias):',
			allParams
		);
		console.log('📋 Received checksum:', checksum);

		// Сортируем параметры по именам в алфавитном порядке (по возрастанию)
		const sortedKeys = Object.keys(allParams).sort();

		// Формируем строку в формате: имя1;значение1;имя2;значение2;...;имяN;значениеN;
		// Обратите внимание: строка заканчивается точкой с запятой!
		const dataString = sortedKeys
			.map((key) => `${key};${allParams[key] || ''};`)
			.join('');

		console.log('📝 Sorted parameter keys:', sortedKeys);
		console.log('📝 Generated data string:', dataString);

		// Вычисляем HMAC-SHA256
		const calculatedChecksum = crypto
			.createHmac('sha256', callbackToken)
			.update(dataString)
			.digest('hex')
			.toUpperCase();

		const receivedChecksumUpper = checksum.toUpperCase();

		console.log('🔐 Signature verification:');
		console.log('  Data string:', dataString);
		console.log('  Calculated checksum:', calculatedChecksum);
		console.log('  Received checksum:', receivedChecksumUpper);
		console.log(
			'  Match:',
			receivedChecksumUpper === calculatedChecksum ? '✅ YES' : '❌ NO'
		);

		const isValid = receivedChecksumUpper === calculatedChecksum;
		const matchedVariant = isValid
			? 'Correct format (name1;value1;name2;value2;...;nameN;valueN;)'
			: null;

		if (!isValid) {
			console.error('❌ SIGNATURE VERIFICATION FAILED');
			console.error('Received checksum:', receivedChecksumUpper);
			console.error('Tried all variants, none matched');
			console.log('=== SIGNATURE VERIFICATION END (FAILED) ===');
			return res.status(400).send('Invalid signature');
		}

		console.log(
			`✅ SIGNATURE VERIFICATION SUCCESS (matched: ${matchedVariant})`
		);
		console.log('=== SIGNATURE VERIFICATION END ===');

		// Обрабатываем только успешное списание средств
		if (operation === 'deposited' && status === '1') {
			// Проверяем, не создан ли уже заказ (чтобы избежать дублирования)
			const existingOrder = await orderModel.getOrderByOrderNumber(orderNumber);

			if (existingOrder) {
				console.log(`Order with orderNumber ${orderNumber} already exists`);
				return res.status(200).send('OK');
			}

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
				date_order: date || new Date().toISOString().split('T')[0],
			};

			if (orderDescription) {
				console.log('📝 Parsing orderDescription:', orderDescription);

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

				console.log('📋 Parsed data from orderDescription:', parsedData);
			}

			// Используем amount из callback (в копейках, переводим в рубли)
			if (amount) {
				parsedData.sum = parseInt(amount, 10) / 100;
			}

			// Если данных из orderDescription недостаточно, пытаемся получить из backup (fallback)
			if (!parsedData.email && !parsedData.phone) {
				console.log(
					'⚠️  Insufficient data from orderDescription, trying backup...'
				);
				const orderBackup = await orderBackupModel.getOrderBackupByOrderNumber(
					orderNumber
				);

				if (orderBackup) {
					parsedData = {
						userId: orderBackup.user_id,
						phone: parsedData.phone || orderBackup.phone,
						email: parsedData.email || orderBackup.email,
						address: parsedData.address || orderBackup.address,
						city: parsedData.city || orderBackup.city,
						sum: parsedData.sum || orderBackup.sum,
						product_quantity:
							parsedData.product_quantity || orderBackup.product_quantity,
						products_info:
							parsedData.products_info || orderBackup.products_info,
						orderNumber: orderBackup.orderNumber,
						date_order: parsedData.date_order || orderBackup.date_order,
					};
					console.log('📋 Using backup data:', parsedData);
				} else {
					console.error(
						`Order backup not found for orderNumber: ${orderNumber}`
					);
					return res.status(200).send('OK');
				}
			}

			// Создаем основной заказ
			const orderId = await orderModel.createOrder(parsedData);
			console.log(
				`✅ Order created successfully with ID: ${orderId} for orderNumber: ${orderNumber}`
			);

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
