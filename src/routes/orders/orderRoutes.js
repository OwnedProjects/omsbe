const express = require("express");
const {
  createOrder,
  getPendingOrders,
  markOrderAsDone,
} = require("../../controllers/orders/orderController");

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

    // Emit WebSocket event for new orders (if using WebSockets)
    if (req.app.get("io")) {
      req.app.get("io").emit("newOrder", result);
    }

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// New endpoint to fetch pending orders
router.get("/pendingorders", async (req, res) => {
  try {
    const orders = await getPendingOrders();
    return res.json(orders);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.put("/:orderId/done", async (req, res) => {
  console.log("Received request:", req.params.orderId);

  const { orderId } = req.params;

  try {
    const result = await markOrderAsDone(orderId);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.code || 500).json(error);
  }
});

module.exports = router;
