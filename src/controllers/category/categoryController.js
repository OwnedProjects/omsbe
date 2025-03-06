const { pool } = require("../../config/db");

const getActiveCategories = () => {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, conn) => {
      if (err?.code === "ECONNREFUSED") {
        conn.release();
        return reject({
          code: 500,
          status: "error",
          message: constants.DATABASE_CONNECTION_FAILED,
        });
      }

      conn.query(
        `SELECT * FROM order_management.inventory_category WHERE status=?`,
        ["active"],
        (err, result) => {
          conn.release();
          if (err) {
            return reject({
              code: 422,
              status: "error",
              message: constants.DATABASE_QUERY_ISSUE,
            });
          }

          return resolve({
            code: 200,
            status: "success",
            categories: result,
          });
        }
      );
    });
  });
};

const getProductsByCategory = (categoryId = null) => {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, conn) => {
      if (err?.code === "ECONNREFUSED") {
        conn.release();
        return reject({
          code: 500,
          status: "error",
          message: "Database connection failed",
        });
      }

      let query = `
          SELECT p.product_id, p.product_name, p.image_url, p.price, p.status, c.category_name 
          FROM order_management.products p
          JOIN order_management.inventory_category c ON p.category_id = c.category_id
        `;
      let queryParams = [];

      if (categoryId) {
        query += " WHERE p.category_id = ?";
        queryParams.push(categoryId);
      }

      conn.query(query, queryParams, (err, result) => {
        conn.release();
        if (err) {
          return reject({
            code: 422,
            status: "error",
            message: "Database query issue",
          });
        }

        return resolve({
          code: 200,
          status: "success",
          products: result,
        });
      });
    });
  });
};

module.exports = { getActiveCategories, getProductsByCategory };
