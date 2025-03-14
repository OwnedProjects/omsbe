const express = require("express");
const {
  createOrder,
  getPendingOrders,
  markOrderAsDone,
  getDoneOrders,
  markOrderAsClose,
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

// New endpoint to fetch pending orders
router.get("/doneorders", async (req, res) => {
  try {
    const orders = await getDoneOrders();
    return res.json(orders);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.put("/:orderId/done", async (req, res) => {
  const { orderId } = req.params;

  try {
    const result = await markOrderAsDone(orderId);

    // Emit WebSocket event for DONE orders (if using WebSockets)
    if (req.app.get("io")) {
      req.app.get("io").emit("doneOrders", result);
    }

    res.status(200).json(result);
  } catch (error) {
    res.status(error.code || 500).json(error);
  }
});

router.put("/:orderId/close", async (req, res) => {
  const { orderId } = req.params;

  try {
    const result = await markOrderAsClose(orderId);

    // ✅ Emit WebSocket event with order_no
    if (req.app.get("io")) {
      req.app.get("io").emit("doneOrders", {
        order_id: orderId,
        order_no: result.order_no, // ✅ Now sending order_no
        status: "completed",
      });
    }

    res.status(200).json(result);
  } catch (error) {
    res
      .status(error.code && Number.isInteger(error.code) ? error.code : 500)
      .json(error);
  }
});

module.exports = router;
