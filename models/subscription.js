const { pool } = require("../utils/utils");

const subsribe = async (email) => {
  try {
    const [rows, fields] = await pool.execute(
      `
        INSERT INTO subscription (email)
        VALUES (?)
        `,
      [email]
    );

    console.log("Rows inserted:", rows);

    return rows.insertId;
  } catch (error) {
    console.error("Error in subcribe:", error);
    throw error;
  }
};

module.exports = {
  subsribe,
};
