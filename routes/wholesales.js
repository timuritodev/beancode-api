const express = require("express");
const wholesaleModel = require("../models/wholesale");

const router = express.Router();

router.post("/wholesale/send", async (req, res) => {
  const wholesaleData = req.body;
  try {
    const orderId = await wholesaleModel.createOrder(wholesaleData);
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
