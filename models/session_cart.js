const { pool } = require('../utils/utils');

const addToSessionCart = async (
	sessionId,
	productId,
	product_price,
	product_weight
) => {
	try {
		// Проверяем существование пользователя в таблице cart
		const userInCart = await pool.execute(
			'SELECT * FROM session_cart WHERE session_id = ?',
			[sessionId]
		);

		if (userInCart[0].length === 0) {
			// Если пользователя нет в корзине, создаем новую корзину
			const createCartResult = await pool.execute(
				'INSERT INTO session_cart (session_id) VALUES (?)',
				[sessionId]
			);

			if (createCartResult[0].affectedRows > 0) {
				// Получаем id новой корзины
				const newCartId = createCartResult[0].insertId;

				// Вставляем товар в корзину
				const insertProductResult = await pool.execute(
					'INSERT INTO session_cart_product (session_cart_id, product_id, product_price, product_weight) VALUES (?, ?, ?, ?)',
					[newCartId, productId, product_price, product_weight]
				);

				if (insertProductResult[0].affectedRows > 0) {
					return { success: true };
				}
			}
			return { success: false, error: 'Failed to add product to cart' };
		}

		// Вставляем товар в существующую корзину
		const result = await pool.execute(
			'INSERT INTO session_cart_product (session_cart_id, product_id, product_price, product_weight) VALUES (?, ?, ?, ?)',
			[userInCart[0][0].id, productId, product_price, product_weight]
		);

		if (result[0].affectedRows > 0) {
			return { success: true };
		} else {
			return { success: false, error: 'Failed to add product to cart' };
		}
	} catch (error) {
		console.error('Error adding product to cart:', error);
		throw error;
	}
};

const removeFromSessionCart = async (
	sessionId,
	productId,
	product_price,
	product_weight
) => {
	try {
		// Check if the user has a cart
		const userInCart = await pool.execute(
			'SELECT * FROM session_cart WHERE session_id = ?',
			[sessionId]
		);

		if (userInCart[0].length === 0) {
			return { success: false, error: 'User does not have a cart' };
		}

		// Remove one instance of the product from the cart
		const result = await pool.execute(
			'DELETE FROM session_cart_product WHERE session_cart_id = ? AND product_id = ? AND product_price = ? AND product_weight = ? LIMIT 1',
			[userInCart[0][0].id, productId, product_price, product_weight]
		);

		if (result[0].affectedRows > 0) {
			return { success: true };
		} else {
			return { success: false, error: 'Failed to remove product from cart' };
		}
	} catch (error) {
		console.error('Error removing product from cart:', error);
		throw error;
	}
};

const clearSessionCartByUserId = async (sessionId) => {
	try {
		const userCartResult = await pool.execute(
			'SELECT id FROM session_cart WHERE session_id = ?',
			[sessionId]
		);

		if (userCartResult[0].length === 0) {
			return { success: false, error: 'Cart does not exist' };
		}

		const cartId = userCartResult[0][0].id;

		const [result] = await pool.execute(
			'DELETE FROM session_cart_product WHERE session_cart_id = ?',
			[cartId]
		);

		if (result.affectedRows === 0) {
			return {
				success: false,
				error: 'No products in cart or could not clear cart',
			};
		}

		return { success: true };
	} catch (error) {
		console.error('Error clearing session cart:', error);
		throw error;
	}
};

const getSessionCartByUserId = async (sessionId) => {
	try {
		const [cart] = await pool.execute(
			'SELECT id FROM session_cart WHERE session_id = ?',
			[sessionId]
		);

		if (cart.length === 0) {
			return []; // No cart for user
		}

		const cartId = cart[0].id;

		const [productRows] = await pool.execute(
			'SELECT cp.id, cp.session_cart_id, cp.product_id, cp.product_price, cp.product_weight, p.title, p.v_picture, p.h_picture FROM session_cart_product cp JOIN product p ON cp.product_id = p.id WHERE cp.session_cart_id = ?',
			[cartId]
		);

		return productRows.map((row) => ({
			id: row.product_id,
			title: row.title,
			price: row.product_price,
			weight: row.product_weight,
			v_picture: row.v_picture,
			h_picture: row.h_picture,
		}));
	} catch (error) {
		console.error('Error getting cart by user id:', error);
		throw error;
	}
};

module.exports = {
	addToSessionCart,
	removeFromSessionCart,
	clearSessionCartByUserId,
	getSessionCartByUserId,
};

// CREATE TABLE session_cart (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     session_id VARCHAR(255) NOT NULL
//   );

//   CREATE TABLE session_cart_product (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     session_cart_id INT NOT NULL,
//     product_id INT NOT NULL,
//     product_price varchar(100) NOT NULL,
//     product_weight varchar(100) NOT NULL,
//     FOREIGN KEY (session_cart_id) REFERENCES session_cart(id),
//     FOREIGN KEY (product_id) REFERENCES product(id)
//   );

// CREATE TABLE sessions (
//     session_id VARCHAR(128) NOT NULL PRIMARY KEY,
//     expires BIGINT UNSIGNED NOT NULL,
//     data TEXT
// );
