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

		console.log('📋 Input parameters:', {
			mdOrder: mdOrder || '(empty)',
			orderNumber,
			operation,
			status,
			receivedChecksum: checksum,
			callbackTokenLength: callbackToken ? callbackToken.length : 0,
			callbackTokenPreview: callbackToken
				? `${callbackToken.substring(0, 4)}...${callbackToken.substring(
						callbackToken.length - 4
				  )}`
				: 'NOT SET',
		});

		// Вариант 1: С разделителем точка с запятой
		const dataToVerify1 = `${
			mdOrder || ''
		};${orderNumber};${operation};${status}`;
		const calculatedChecksum1 = crypto
			.createHmac('sha256', callbackToken)
			.update(dataToVerify1)
			.digest('hex')
			.toUpperCase();

		console.log('🔐 Variant 1 (with semicolon separator):');
		console.log('  Data string:', dataToVerify1);
		console.log('  Calculated checksum:', calculatedChecksum1);
		console.log('  Received checksum:', checksum.toUpperCase());
		console.log(
			'  Match:',
			checksum.toUpperCase() === calculatedChecksum1 ? '✅ YES' : '❌ NO'
		);

		// Вариант 2: Без разделителей
		const dataToVerify2 = `${mdOrder || ''}${orderNumber}${operation}${status}`;
		const calculatedChecksum2 = crypto
			.createHmac('sha256', callbackToken)
			.update(dataToVerify2)
			.digest('hex')
			.toUpperCase();

		console.log('🔐 Variant 2 (no separator):');
		console.log('  Data string:', dataToVerify2);
		console.log('  Calculated checksum:', calculatedChecksum2);
		console.log('  Received checksum:', checksum.toUpperCase());
		console.log(
			'  Match:',
			checksum.toUpperCase() === calculatedChecksum2 ? '✅ YES' : '❌ NO'
		);

		// Вариант 3: Порядок orderNumber, mdOrder, operation, status
		const dataToVerify3 = `${orderNumber};${
			mdOrder || ''
		};${operation};${status}`;
		const calculatedChecksum3 = crypto
			.createHmac('sha256', callbackToken)
			.update(dataToVerify3)
			.digest('hex')
			.toUpperCase();

		console.log('🔐 Variant 3 (orderNumber first, with semicolon):');
		console.log('  Data string:', dataToVerify3);
		console.log('  Calculated checksum:', calculatedChecksum3);
		console.log('  Received checksum:', checksum.toUpperCase());
		console.log(
			'  Match:',
			checksum.toUpperCase() === calculatedChecksum3 ? '✅ YES' : '❌ NO'
		);

		// Вариант 4: Порядок orderNumber, mdOrder, operation, status без разделителей
		const dataToVerify4 = `${orderNumber}${mdOrder || ''}${operation}${status}`;
		const calculatedChecksum4 = crypto
			.createHmac('sha256', callbackToken)
			.update(dataToVerify4)
			.digest('hex')
			.toUpperCase();

		console.log('🔐 Variant 4 (orderNumber first, no separator):');
		console.log('  Data string:', dataToVerify4);
		console.log('  Calculated checksum:', calculatedChecksum4);
		console.log('  Received checksum:', checksum.toUpperCase());
		console.log(
			'  Match:',
			checksum.toUpperCase() === calculatedChecksum4 ? '✅ YES' : '❌ NO'
		);

		// Проверяем все варианты
		const isValid =
			checksum.toUpperCase() === calculatedChecksum1 ||
			checksum.toUpperCase() === calculatedChecksum2 ||
			checksum.toUpperCase() === calculatedChecksum3 ||
			checksum.toUpperCase() === calculatedChecksum4;

		if (!isValid) {
			console.error('❌ SIGNATURE VERIFICATION FAILED');
			console.error('All calculated checksums:', {
				variant1: calculatedChecksum1,
				variant2: calculatedChecksum2,
				variant3: calculatedChecksum3,
				variant4: calculatedChecksum4,
			});
			console.error('Received checksum:', checksum.toUpperCase());
			console.log('=== SIGNATURE VERIFICATION END (FAILED) ===');
			return res.status(400).send('Invalid signature');
		}

		console.log('✅ SIGNATURE VERIFICATION SUCCESS');
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
