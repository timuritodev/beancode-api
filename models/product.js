const { pool } = require("../utils/utils");

const getAllProducts = async () => {
  const [rows, fields] = await pool.execute("SELECT * FROM product");
  return rows;
};

const getProductById = async (productId) => {
  const [rows, fields] = await pool.execute(
    "SELECT * FROM product WHERE id = ?",
    [productId]
  );
  return rows[0];
};

module.exports = {
  getAllProducts,
  getProductById,
};
