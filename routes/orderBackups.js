const express = require("express");
const orderBackupModel = require("../models/orderBackup");

const router = express.Router();

router.post("/order-backup/create", async (req, res) => {
  const orderData = req.body;
  try {
    const orderId = await orderBackupModel.createOrderBackup(orderData);

    if (orderId) {
      res.status(201).json({ orderId });
    } else {
      res.status(400).json({ error: "Failed to create order" });
    }
  } catch (error) {
    console.error("Error creating order", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
