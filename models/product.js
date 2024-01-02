// const mysql = require('mysql2/promise');
const { pool } = require("../utils/utils");

// const pool = mysql.createPool({
//   host: 'localhost',
//   user: 'root',
//   password: 'timur2003',
//   database: 'coffee',
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
// });

const getAllProducts = async () => {
  const [rows, fields] = await pool.execute("SELECT * FROM product");
  return rows;
};

const getProductById = async (productId) => {
  const [rows, fields] = await pool.execute(
    "SELECT * FROM product WHERE id = ?",
    [productId]
  );
  return rows[0]; // Assuming that the ID is unique; return the first result
};

const addToCart = async (userId, productId) => {
  try {
    // Проверяем существование пользователя в таблице cart
    const userInCart = await pool.execute(
      "SELECT * FROM cart WHERE user_id = ?",
      [userId]
    );

    if (userInCart[0].length === 0) {
      // Если пользователя нет в корзине, создаем новую корзину
      const createCartResult = await pool.execute(
        "INSERT INTO cart (user_id) VALUES (?)",
        [userId]
      );

      if (createCartResult[0].affectedRows > 0) {
        // Получаем id новой корзины
        const newCartId = createCartResult[0].insertId;

        // Вставляем товар в корзину
        const insertProductResult = await pool.execute(
          "INSERT INTO cart_product (cart_id, product_id) VALUES (?, ?)",
          [newCartId, productId]
        );

        if (insertProductResult[0].affectedRows > 0) {
          return { success: true };
        }
      }
      return { success: false, error: "Failed to add product to cart" };
    }

    // Вставляем товар в существующую корзину
    const result = await pool.execute(
      "INSERT INTO cart_product (cart_id, product_id) VALUES (?, ?)",
      [userInCart[0][0].id, productId]
    );

    if (result[0].affectedRows > 0) {
      return { success: true };
    } else {
      return { success: false, error: "Failed to add product to cart" };
    }
  } catch (error) {
    console.error("Error adding product to cart:", error);
    throw error;
  }
};
const removeFromCart = async (userId, productId) => {
  try {
    // Check if the user has a cart
    const userInCart = await pool.execute(
      "SELECT * FROM cart WHERE user_id = ?",
      [userId]
    );

    if (userInCart[0].length === 0) {
      return { success: false, error: "User does not have a cart" };
    }

    // Remove one instance of the product from the cart
    const result = await pool.execute(
      "DELETE FROM cart_product WHERE cart_id = ? AND product_id = ? LIMIT 1",
      [userInCart[0][0].id, productId]
    );

    if (result[0].affectedRows > 0) {
      return { success: true };
    } else {
      return { success: false, error: "Failed to remove product from cart" };
    }
  } catch (error) {
    console.error("Error removing product from cart:", error);
    throw error;
  }
};

const deleteProductsByUserId = async (userId) => {
  try {
    // Check if the user has a cart
    const userInCart = await pool.execute(
      "SELECT * FROM cart WHERE user_id = ?",
      [userId]
    );

    if (userInCart[0].length === 0) {
      return { success: false, error: "User does not have a cart" };
    }

    // Delete all products associated with the user's cart
    const result = await pool.execute(
      "DELETE FROM cart_product WHERE cart_id = ?",
      [userInCart[0][0].id]
    );

    if (result[0].affectedRows > 0) {
      return { success: true };
    } else {
      return { success: false, error: "Failed to delete products" };
    }
  } catch (error) {
    console.error("Error deleting products:", error);
    throw error;
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  addToCart,
  removeFromCart,
  deleteProductsByUserId
};
