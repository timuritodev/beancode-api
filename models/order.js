const { pool } = require('../utils/utils');

const createOrder = async (orderData) => {
	const {
		userId,
		phone,
		email,
		address,
		city,
		sum,
		product_quantity,
		products_info,
		orderNumber,
		date_order,
	} = orderData;

	try {
		const [rows, fields] = await pool.execute(
			`
        INSERT INTO orders (user_id, phone, email, address, city, sum, product_quantity, products_info, orderNumber, date_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
			[
				userId,
				phone,
				email,
				address,
				city,
				sum,
				product_quantity,
				products_info,
				orderNumber,
				date_order,
			]
		);

		console.log('Rows inserted:', rows);

		return rows.insertId;
	} catch (error) {
		console.error('Error in createOrder:', error);
		throw error;
	}
};

const getAllOrders = async () => {
	const [rows, fields] = await pool.execute('SELECT * FROM orders');
	return rows;
};

const getOrdersByUserId = async (userId) => {
	const [rows, fields] = await pool.execute(
		'SELECT * FROM orders WHERE user_id = ?',
		[userId]
	);
	return rows;
};

const getOrderByOrderNumber = async (orderNumber) => {
	try {
		const [rows, fields] = await pool.execute(
			'SELECT * FROM orders WHERE orderNumber = ? LIMIT 1',
			[orderNumber]
		);
		return rows[0] || null;
	} catch (error) {
		console.error('Error in getOrderByOrderNumber:', error);
		throw error;
	}
};

const updateOrderStatus = async (orderId, status) => {
	try {
		const [rows, fields] = await pool.execute(
			'UPDATE orders SET status = ? WHERE id = ?',
			[status, orderId]
		);
		return rows.affectedRows > 0;
	} catch (error) {
		console.error('Error in updateOrderStatus:', error);
		throw error;
	}
};

const getOrderById = async (orderId) => {
	try {
		const [rows, fields] = await pool.execute(
			'SELECT * FROM orders WHERE id = ? LIMIT 1',
			[orderId]
		);
		return rows[0] || null;
	} catch (error) {
		console.error('Error in getOrderById:', error);
		throw error;
	}
};

/**
 * Генерирует уникальный номер заказа
 * Формат: случайное число от 100000 до 9999999 (6-7 цифр)
 * Проверяет уникальность в БД и повторяет генерацию при необходимости
 */
const generateUniqueOrderNumber = async () => {
	const maxAttempts = 10; // Максимальное количество попыток генерации

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		// Генерируем случайное число от 100000 до 9999999 (6-7 цифр)
		const min = 100000; // 6 цифр
		const max = 9999999; // 7 цифр
		const orderNumber = String(
			Math.floor(Math.random() * (max - min + 1)) + min
		);

		// Проверяем уникальность в БД
		const existingOrder = await getOrderByOrderNumber(orderNumber);

		if (!existingOrder) {
			console.log(`✅ Generated unique order number: ${orderNumber}`);
			return orderNumber;
		}

		console.warn(
			`⚠️  Order number ${orderNumber} already exists, retrying... (attempt ${
				attempt + 1
			}/${maxAttempts})`
		);

		// Небольшая задержка перед следующей попыткой
		await new Promise((resolve) => setTimeout(resolve, 10));
	}

	// Если не удалось сгенерировать уникальный номер за maxAttempts попыток
	throw new Error(
		'Failed to generate unique order number after multiple attempts'
	);
};

module.exports = {
	getAllOrders,
	createOrder,
	getOrdersByUserId,
	getOrderByOrderNumber,
	updateOrderStatus,
	getOrderById,
	generateUniqueOrderNumber,
};
