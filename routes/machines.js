const express = require("express");
const machineModel = require("../models/machine");

const router = express.Router();

router.get("/api/machines", async (req, res) => {
  try {
    const machines = await machineModel.getAllMachines();
    res.json(machines);
  } catch (error) {
    console.error("Error fetching machines:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/api/machines/:id", async (req, res) => {
  const machineId = req.params.id;

  try {
    const machine = await machineModel.getMachineById(machineId);

    if (!machine) {
      res.status(404).json({ error: "machine not found" });
      return;
    }

    res.json(machine);
  } catch (error) {
    console.error("Error fetching machine by ID:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
