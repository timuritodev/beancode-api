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
  const {
    userId,
    phone,
    email,
    address,
    city,
    sum,
    product_ids,
    product_titles,
    product_quantity,
  } = req.body;
  try {
    const result = await orderModel.createOrder(
      userId,
      phone,
      email,
      address,
      city,
      sum,
      product_ids,
      product_titles,
      product_quantity
    );

    if (result.success) {
      res.status(201).json({ message: "Created order successfully" });
    } else {
      res.status(400).json({ error: "Failed to create order" });
    }
  } catch (error) {
    console.error("Error creating order", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
