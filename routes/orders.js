const express = require("express");
const orderModel = require("../models/order");

const router = express.Router();

// router.post("/create/order", async (req, res, next) => {
//   try {
//     const userId = await orderModel.createOrder(req.body);
//     res.status(201).json({ userId });
//   } catch (error) {
//     next(error);
//   }
// });

router.post("/create/order", async (req, res) => {
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

module.exports = router;
