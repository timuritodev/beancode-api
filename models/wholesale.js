const { pool } = require("../utils/utils");

// create table wholesale(
//     id int auto_increment primary key,
//     title varchar(100) not null,
//     inn int not null,
//     fio varchar(100) not null,
//     phone varchar(100) not null,
//     email varchar(100) not null
//     );

const createWholesale = async (wholesaleData) => {
  const { title, inn, fio, phone, email } = wholesaleData;

  try {
    const [rows, fields] = await pool.execute(
      `
        INSERT INTO wholesale (title, inn, fio, phone, email, consumption)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [title, inn, fio, phone, email, consumption]
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
