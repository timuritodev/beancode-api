const express = require("express");
const subcribeModel = require("../models/subscription");

const router = express.Router();

router.post("/api/subscription/add", async (req, res) => {
  const { email } = req.body;

  try {
    const insertId = await subcribeModel.subsribe(email);

    if (insertId) {
      res.status(201).json({ success: true });
    } else {
      res.status(400).json({ error: "Failed to subcribe" });
    }
  } catch (error) {
    console.error("Error subcribe:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
