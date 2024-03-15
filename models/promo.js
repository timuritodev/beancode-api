const { pool } = require("../utils/utils");

const createPromoCode = async (promoCodeData) => {
    const { promo, discount, valid_from, valid_until } = promoCodeData;
    try {
      const [rows, fields] = await pool.execute(
        `
        INSERT INTO promo_codes (promo, discount, valid_from, valid_until)
        VALUES (?, ?, ?, ?)
        `,
        [promo, discount, valid_from, valid_until]
      );
  
      console.log("Rows inserted:", rows);
  
      return rows.insertId;
    } catch (error) {
      console.error("Error in createPromoCode:", error);
      throw error;
    }
  };
  
  const findPromoCodeByCode = async (promo) => {
    const [rows, fields] = await pool.execute(`
      SELECT * FROM promo_codes
      WHERE promo = ? 
    `, [promo]);
  
    return rows.length > 0 ? rows[0] : null;
  };
  
  const isPromoCodeAlreadyUsed = async (userId, promoCodeId) => {
    const [rows, fields] = await pool.execute(
      `
      SELECT * FROM promo_code_usage
      WHERE user_id = ? AND promo_code_id = ?
      `,
      [userId, promoCodeId]
    );
  
    return rows.length > 0;
  };
  
  const recordPromoCodeUsage = async (userId, promoCodeId) => {
    const usageDate = new Date();
    try {
      const [rows, fields] = await pool.execute(
        `
        INSERT INTO promo_code_usage (user_id, promo_code_id, usage_date)
        VALUES (?, ?, ?)
        `,
        [userId, promoCodeId, usageDate]
      );
  
      console.log("Rows inserted:", rows);
    } catch (error) {
      console.error("Error in recordPromoCodeUsage:", error);
      throw error;
    }
  };

  
  const getAllPromoCodes = async () => {
    const [rows, fields] = await pool.execute('SELECT * FROM promo_codes');
    return rows;
  };
  
  module.exports = {
    findPromoCodeByCode,
    getAllPromoCodes,
    createPromoCode,
    isPromoCodeAlreadyUsed,
    recordPromoCodeUsage
  };
  