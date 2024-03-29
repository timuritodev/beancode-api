const { pool } = require("../utils/utils");

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
    date_order
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
        date_order
      ]
    );

    console.log("Rows inserted:", rows);

    return rows.insertId;
  } catch (error) {
    console.error("Error in createOrder:", error);
    throw error;
  }
};

const getAllOrders = async () => {
  const [rows, fields] = await pool.execute("SELECT * FROM orders");
  return rows;
};

const getOrdersByUserId = async (userId) => {
  const [rows, fields] = await pool.execute(
    "SELECT * FROM orders WHERE user_id = ?",
    [userId]
  );
  return rows;
};

module.exports = {
  getAllOrders,
  createOrder,
  getOrdersByUserId,
};
