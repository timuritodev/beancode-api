const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { emailRegex } = require('../utils/utils');
// const { ValidationError, ConflictError } = require('../errors');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'timur2003',
  database: 'coffee',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

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
  const { name, surname, phone, email, address } = userData;
  const hashedPassword = await bcrypt.hash(userData.password, 10);

  const [rows, fields] = await pool.execute(`
    INSERT INTO user (name, surname, phone, email, address, password)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [name, surname, phone, email, address, hashedPassword]);

  return rows.insertId;
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
