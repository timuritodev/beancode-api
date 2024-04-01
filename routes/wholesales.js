const express = require("express");
const wholesaleModel = require("../models/wholesale");

const router = express.Router();

router.post("/api/wholesale/send", async (req, res) => {
  const wholesaleData = req.body;
  try {
    const wholesaleId = await wholesaleModel.createWholesale(wholesaleData);
    if (wholesaleId) {
      res.status(201).json({ success: true });
    } else {
      res.status(400).json({ error: "Failed to create order" });
    }
  } catch (error) {
    console.error("Error creating order", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
