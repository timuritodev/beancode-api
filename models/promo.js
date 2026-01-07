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

  /**
   * Применяет промокод (сохраняет в applied_promo_codes)
   * Удаляет предыдущий примененный промокод, если есть
   */
  const applyPromoCode = async (userId, promoCodeId) => {
    try {
      // Удаляем предыдущий примененный промокод для этого пользователя
      await pool.execute(
        'DELETE FROM applied_promo_codes WHERE user_id = ?',
        [userId]
      );

      // Добавляем новый примененный промокод
      const [rows, fields] = await pool.execute(
        `
        INSERT INTO applied_promo_codes (user_id, promo_code_id)
        VALUES (?, ?)
        `,
        [userId, promoCodeId]
      );

      return rows.insertId;
    } catch (error) {
      console.error('Error in applyPromoCode:', error);
      throw error;
    }
  };

  /**
   * Получает примененный промокод для пользователя
   */
  const getAppliedPromoCode = async (userId) => {
    try {
      const [rows, fields] = await pool.execute(
        `
        SELECT pc.id, pc.promo, pc.discount
        FROM applied_promo_codes apc
        JOIN promo_codes pc ON apc.promo_code_id = pc.id
        WHERE apc.user_id = ?
        `,
        [userId]
      );

      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error in getAppliedPromoCode:', error);
      throw error;
    }
  };

  /**
   * Удаляет примененный промокод для пользователя
   */
  const removeAppliedPromoCode = async (userId) => {
    try {
      const [rows, fields] = await pool.execute(
        'DELETE FROM applied_promo_codes WHERE user_id = ?',
        [userId]
      );

      return rows.affectedRows > 0;
    } catch (error) {
      console.error('Error in removeAppliedPromoCode:', error);
      throw error;
    }
  };

  /**
   * Проверяет, применен ли промокод для пользователя
   */
  const isPromoCodeApplied = async (userId, promoCodeId) => {
    try {
      const [rows, fields] = await pool.execute(
        `
        SELECT * FROM applied_promo_codes
        WHERE user_id = ? AND promo_code_id = ?
        `,
        [userId, promoCodeId]
      );

      return rows.length > 0;
    } catch (error) {
      console.error('Error in isPromoCodeApplied:', error);
      throw error;
    }
  };
  
  module.exports = {
    findPromoCodeByCode,
    getAllPromoCodes,
    createPromoCode,
    isPromoCodeAlreadyUsed,
    recordPromoCodeUsage,
    applyPromoCode,
    getAppliedPromoCode,
    removeAppliedPromoCode,
    isPromoCodeApplied
  };
  