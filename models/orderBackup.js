const { pool } = require("../utils/utils");

const createOrderBackup = async (orderData) => {
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
        INSERT INTO orderbackups (user_id, phone, email, address, city, sum, product_quantity, products_info, orderNumber, date_order)
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

module.exports = {
  createOrderBackup,
};
