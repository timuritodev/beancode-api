const bcrypt = require('bcryptjs');
const { emailRegex, pool } = require('../utils/utils');
// const { ValidationError, ConflictError } = require('../errors');

const createUser = async (userData) => {
  const { name, surname, phone, email, address, password } = userData;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const [rows, fields] = await pool.execute(
      `
      INSERT INTO user (name, surname, phone, email, address, password)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [name, surname, phone, email, address, hashedPassword]
    );

    console.log("Rows inserted:", rows);

    return rows.insertId;
  } catch (error) {
    console.error("Error in createUser:", error);
    throw error;
  }
};


const findUserByCredentials = async (email, password) => {
  const [rows, fields] = await pool.execute(`
    SELECT * FROM user
    WHERE email = ? 
  `, [email]);

  if (!rows || rows.length === 0) {
    return null;
  }

  const user = rows[0];
  const isPasswordMatch = await bcrypt.compare(password, user.password);

  if (!isPasswordMatch) {
    return null;
  }

  delete user.password;
  return user;
};

// const updateUser = async (userId, updatedUserData) => {
//   const { name, surname, phone, email, address } = updatedUserData;
  
//   // Проверка и установка только определенных полей
//   const updateFields = [];
//   const updateValues = [];

//   if (name !== undefined) {
//     updateFields.push('name');
//     updateValues.push(name);
//   }

//   if (surname !== undefined) {
//     updateFields.push('surname');
//     updateValues.push(surname);
//   }

//   if (phone !== undefined) {
//     updateFields.push('phone');
//     updateValues.push(phone);
//   }

//   if (email !== undefined) {
//     updateFields.push('email');
//     updateValues.push(email);
//   }

//   if (address !== undefined) {
//     updateFields.push('address');
//     updateValues.push(address);
//   }

//   try {
//     const [rows, fields] = await pool.execute(
//       `
//       UPDATE user
//       SET ${updateFields.map(field => `${field} = ?`).join(', ')}
//       WHERE id = ?
//       `,
//       [...updateValues, userId]
//     );

//   } catch (error) {
//     console.error("Error in updateUser:", error);
//     throw error;
//   }
// };


const updateUser = async (userId, updatedUserData) => {
  const fieldsToUpdate = Object.entries(updatedUserData)
    .filter(([key, value]) => value !== undefined)
    .map(([key]) => `${key} = ?`)
    .join(', ');

  const valuesToUpdate = Object.values(updatedUserData).filter(value => value !== undefined);

  try {
    const [rows, fields] = await pool.execute(
      `
      UPDATE user
      SET ${fieldsToUpdate}
      WHERE id = ?
      `,
      [...valuesToUpdate, userId]
    );

  } catch (error) {
    console.error("Error in updateUser:", error);
    throw error;
  }
};


const getAllUsers = async () => {
  const [rows, fields] = await pool.execute('SELECT * FROM user');
  return rows;
};

module.exports = {
  createUser,
  findUserByCredentials,
  updateUser,
  getAllUsers,
};
