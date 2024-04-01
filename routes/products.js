const express = require("express");
const productModel = require("../models/product");

const router = express.Router();

router.get("/api/products", async (req, res) => {
  try {
    const products = await productModel.getAllProducts();
    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/api/products/:id", async (req, res) => {
  const productId = req.params.id;

  try {
    const product = await productModel.getProductById(productId);

    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    res.json(product);
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
