const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'timur2003',
  database: 'coffee',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const getAllProducts = async () => {
  const [rows, fields] = await pool.execute('SELECT * FROM product');
  return rows;
};

const getProductById = async (productId) => {
  const [rows, fields] = await pool.execute('SELECT * FROM product WHERE id = ?', [productId]);
  return rows[0]; // Assuming that the ID is unique; return the first result
};

module.exports = {
  getAllProducts,
  getProductById,
};
