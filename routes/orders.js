const express = require("express");
const orderModel = require("../models/order");

const router = express.Router();

router.post("/api/order/create", async (req, res) => {
  const orderData = req.body;
  try {
    const orderId = await orderModel.createOrder(orderData);

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

router.get("/api/order/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    const order = await orderModel.getOrdersByUserId(userId);

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.json(order);
  } catch (error) {
    console.error("Error fetching order by ID:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
