const { pool } = require("../utils/utils");

const createWholesale = async (wholesaleData) => {
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
  } = wholesaleData;

  try {
    const [rows, fields] = await pool.execute(
      `
        INSERT INTO wholesale (user_id, phone, email, address, city, sum, product_quantity, products_info, orderNumber, date_order)
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

    console.log("Rows inserted:", rows);

    return rows.insertId;
  } catch (error) {
    console.error("Error in createWholesale:", error);
    throw error;
  }
};

module.exports = {
  createWholesale,
};
