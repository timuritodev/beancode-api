const bcrypt = require('bcryptjs');
const { emailRegex, pool } = require('../utils/utils');
const jwt = require('jsonwebtoken');
// const { ValidationError, ConflictError } = require('../errors');

const userSchema = {
  name: {
    type: 'VARCHAR(100)',
    required: true,
  },
  surname: {
    type: 'VARCHAR(100)',
    required: true,
  },
  phone: {
    type: 'VARCHAR(100)',
    required: true,
  },
  email: {
    type: 'VARCHAR(100)',
    unique: true,
    required: true,
    validate: {
      validator: (email) => emailRegex.test(email),
      message: 'Enter a valid email',
    },
  },
  address: {
    type: 'VARCHAR(255)',
    required: true,
  },
};

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

const getAllUsers = async () => {
  const [rows, fields] = await pool.execute('SELECT * FROM user');
  return rows;
};

module.exports = {
  createUser,
  findUserByCredentials,
  getAllUsers,
};
