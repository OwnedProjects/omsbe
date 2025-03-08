require("dotenv").config(); // Load environment variables
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const categoryRoutes = require("./routes/category");
const orderRoutes = require("./routes/orders/orderRoutes");
const path = require("path");

const app = express();

// Body parsing middleware (place this before routes)
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // For parsing URL-encoded data

// Routes (must come after bodyParser and session middlewares)
app.use("/api/inventory", categoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/files", express.static(path.join(__dirname, "..", "public")));

module.exports = { app };
