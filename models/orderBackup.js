const { pool } = require("../utils/utils");

const createOrderBackup = async (orderData) => {
  const {
    userId = 0,
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

const getOrderBackupByOrderNumber = async (orderNumber) => {
  try {
    const [rows, fields] = await pool.execute(
      'SELECT * FROM orderbackups WHERE orderNumber = ? ORDER BY id DESC LIMIT 1',
      [orderNumber]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('Error in getOrderBackupByOrderNumber:', error);
    throw error;
  }
};

module.exports = {
  createOrderBackup,
  getOrderBackupByOrderNumber,
};
