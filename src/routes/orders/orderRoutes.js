const express = require("express");
const { createOrder } = require("../../controllers/orders/orderController");
const router = express.Router();

router.post("/createorder", async (req, res) => {
  try {
    const { cartItems, userid } = req.body;
    if (!cartItems || !Array.isArray(cartItems)) {
      return res.status(400).json({ error: "Invalid cart items" });
    }
    if (!userid) {
      return res.status(400).json({ error: "User Id invalid" });
    }

    const result = await createOrder(cartItems, userid);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
