const { pool } = require("../utils/utils");

const addToCart = async (userId, productId, product_price, product_weight) => {
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
          "INSERT INTO cart_product (cart_id, product_id, product_price, product_weight) VALUES (?, ?, ?, ?)",
          [newCartId, productId, product_price, product_weight]
        );

        if (insertProductResult[0].affectedRows > 0) {
          return { success: true };
        }
      }
      return { success: false, error: "Failed to add product to cart" };
    }

    // Вставляем товар в существующую корзину
    const result = await pool.execute(
      "INSERT INTO cart_product (cart_id, product_id, product_price, product_weight) VALUES (?, ?, ?, ?)",
      [userInCart[0][0].id, productId, product_price, product_weight]
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

const removeFromCart = async (
  userId,
  productId,
  product_price,
  product_weight
) => {
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
      "DELETE FROM cart_product WHERE cart_id = ? AND product_id = ? AND product_price = ? AND product_weight = ? LIMIT 1",
      [userInCart[0][0].id, productId, product_price, product_weight]
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

const clearCartByUserId = async (userId) => {
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

const getCartByUserId = async (userId) => {
  // Находим cart_id для данного пользователя
  const [cartRows, cartFields] = await pool.execute(
    "SELECT id as cart_id FROM cart WHERE user_id = ?",
    [userId]
  );

  if (cartRows.length === 0) {
    // Вернуть пустой массив или обработать случай отсутствия корзины
    return [];
  }

  const cartId = cartRows[0].cart_id;

  // Используем найденный cart_id для выбора всех товаров из cart_product
  const [productRows, productFields] = await pool.execute(
    "SELECT cp.id, cp.cart_id, cp.product_id, cp.product_price, cp.product_weight, p.title, p.v_picture, p.h_picture FROM cart_product cp JOIN product p ON cp.product_id = p.id WHERE cp.cart_id = ?",
    [cartId]
  );

  // Маппинг на новую структуру с использованием id вместо product_id
  const mappedResult = productRows.map((row) => ({
    id: row.product_id,
    title: row.title,
    price: row.product_price,
    weight: row.product_weight,
    v_picture: row.v_picture,
    h_picture: row.h_picture,
  }));

  return mappedResult;
};

module.exports = {
  addToCart,
  removeFromCart,
  clearCartByUserId,
  getCartByUserId,
};
