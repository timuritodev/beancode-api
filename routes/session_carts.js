const express = require("express");
const sessionCartModel = require("../models/session_cart");
const productModel = require("../models/product");

const router = express.Router();

router.get("/session-cart", async (req, res) => {
  const sessionId = req.sessionID;
  try {
    const cart = await sessionCartModel.getSessionCartByUserId(sessionId);
    if (!cart) {
      res.status(404).json({ error: "Cart not found" });
      return;
    }

    res.json(cart);
  } catch (error) {
    console.error("Error fetching cart by ID:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/session-cart/add", async (req, res) => {
  const { productId, product_price, product_weight } = req.body;
  const sessionId = req.sessionID; // Вытаскиваем ID сессии

  console.log(sessionId, 'вот онанана')
  const product = await productModel.getProductById(productId);
  try {
    // Вызываем метод модели корзины для добавления товара
    const result = await sessionCartModel.addToSessionCart(
      sessionId,
      productId,
      product_price,
      product_weight
    );

    if (result.success) {
      res.json({
        id: product.id,
        title: product.title,
        price: product_price,
        weight: product_weight,
        v_picture: product.v_picture,
        h_picture: product.h_picture,
      });

      res.status(201);
    } else {
      res.status(400).json({ error: "Failed to add product to cart" });
    }
  } catch (error) {
    console.error("Error adding product to cart:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/session-cart/remove", async (req, res) => {
  const { productId, product_price, product_weight } = req.body;
  const sessionId = req.sessionID; // Вытаскиваем ID сессии

  try {
    const result = await sessionCartModel.removeFromSessionCart(
      sessionId,
      productId,
      product_price,
      product_weight
    );

    if (result.success) {
      res.json({
        id: productId,
        price: product_price,
      });
    } else {
      res
        .status(400)
        .json({ error: result.error || "Failed to remove product from cart" });
    }
  } catch (error) {
    console.error("Error removing product from cart:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/session-cart/clear", async (req, res) => {
  const sessionId = req.sessionID; // Вытаскиваем ID сессии

  try {
    const result = await sessionCartModel.clearSessionCartByUserId(sessionId);

    if (result.success) {
      res.json({ message: "Products deleted successfully" });
    } else {
      res
        .status(400)
        .json({ error: result.error || "Failed to delete products" });
    }
  } catch (error) {
    console.error("Error deleting products:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
