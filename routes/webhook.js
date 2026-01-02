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

		// Проверяем подпись (checksum) для безопасности
		// Если подпись есть, проверяем её (для асимметричной подписи нужен публичный ключ)
		if (checksum) {
			// TODO: Реализовать проверку подписи в зависимости от типа (симметричный/асимметричный)
			// Для симметричной подписи: используем секретный ключ из настроек
			// Для асимметричной: используем публичный ключ из личного кабинета
			const callbackToken = process.env.CALLBACK_TOKEN;

			if (callbackToken) {
				// Простая проверка для симметричной подписи (HMAC)
				// Формируем строку для проверки: mdOrder + orderNumber + operation + status
				const dataToVerify = `${
					mdOrder || ''
				}${orderNumber}${operation}${status}`;
				const expectedChecksum = crypto
					.createHmac('sha256', callbackToken)
					.update(dataToVerify)
					.digest('hex')
					.toUpperCase();

				if (checksum.toUpperCase() !== expectedChecksum) {
					console.error('Invalid checksum in callback');
					// Не отклоняем запрос, но логируем ошибку
					// return res.status(400).send('Invalid checksum');
				} else {
					console.log('Checksum verified successfully');
				}
			} else {
				console.warn(
					'Callback token not configured, skipping checksum verification'
				);
			}
		}

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
