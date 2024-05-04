const { pool } = require("../utils/utils");

const API_BASE_URL = 'https://beancode.ru/api';

const getAllProducts = async () => {
  const [rows, fields] = await pool.execute("SELECT * FROM product");
  return rows;
};

const getProductById = async (productId) => {
  const query = `
    SELECT p.*, GROUP_CONCAT(pp.picture) AS additional_pictures
    FROM product p
    LEFT JOIN product_picture pp ON p.id = pp.product_id
    WHERE p.id = ?
    GROUP BY p.id
  `;
  const [rows, fields] = await pool.execute(query, [productId]);

  if (rows.length === 0) return null;

  // Структурируем продукт с учетом всех его данных
  const product = {
    id: rows[0].id,
    title: rows[0].title,
    description: rows[0].description,
    price: rows[0].price,
    weight: rows[0].weight,
    h_picture: rows[0].h_picture,
    v_picture: rows[0].v_picture,
    acidity: rows[0].acidity,
    density: rows[0].density,
    big_description: rows[0].big_description,
    low_price: rows[0].low_price,
    low_weight: rows[0].low_weight,
    country: rows[0].country,
    additional_pictures: rows[0].additional_pictures ? rows[0].additional_pictures.split(',').map(picture => IMAGE_BASE_URL + picture) : []
  };
  return product;
};

module.exports = {
  getAllProducts,
  getProductById,
};
