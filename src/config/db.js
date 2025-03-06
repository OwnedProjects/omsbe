const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "localhost",
  user: "admin",
  password: "admin",
  database: "order_management",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
