const { pool } = require("../utils/utils");

const getAllMachines = async () => {
  const [rows, fields] = await pool.execute("SELECT * FROM machine");
  return rows;
};

const getMachineById = async (machineId) => {
  const query = "SELECT * FROM machine WHERE id = ?";
  const [rows, fields] = await pool.execute(query, [machineId]);

  if (rows.length === 0) return null;

  const machine = {
    id: rows[0].id,
    title: rows[0].title,
    description: rows[0].description,
    price: rows[0].price,
    h_picture: rows[0].h_picture,
    v_picture: rows[0].v_picture,
    big_description: rows[0].big_description,
  };
  return machine;
};

module.exports = {
  getAllMachines,
  getMachineById,
};
