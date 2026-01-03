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

		console.log('Callback received:', {
			orderNumber,
			mdOrder,
			operation,
			status,
			checksum,
		});

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

			// Получаем данные заказа из backup (данные были сохранены перед оплатой)
			const orderBackup = await orderBackupModel.getOrderBackupByOrderNumber(
				orderNumber
			);

			if (!orderBackup) {
				console.error(`Order backup not found for orderNumber: ${orderNumber}`);
				return res.status(200).send('OK');
			}

			// Создаем основной заказ из backup данных
			const orderData = {
				userId: orderBackup.user_id,
				phone: orderBackup.phone,
				email: orderBackup.email,
				address: orderBackup.address,
				city: orderBackup.city,
				sum: orderBackup.sum,
				product_quantity: orderBackup.product_quantity,
				products_info: orderBackup.products_info,
				orderNumber: orderBackup.orderNumber,
				date_order: orderBackup.date_order,
			};

			const orderId = await orderModel.createOrder(orderData);
			console.log(
				`Order created successfully with ID: ${orderId} for orderNumber: ${orderNumber}`
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
