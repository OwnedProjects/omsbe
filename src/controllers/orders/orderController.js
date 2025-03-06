const { pool } = require("../../config/db");

const createOrder = (cartItems, userid) => {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        return reject({
          code: 500,
          status: "error",
          message: "Database connection failed",
        });
      }

      connection.beginTransaction((err) => {
        if (err) {
          connection.release();
          return reject({
            code: 500,
            status: "error",
            message: "Transaction initialization failed",
          });
        }

        try {
          const todayDate = new Date().toISOString().split("T")[0];

          connection.query(
            `SELECT order_no FROM order_management.order_master WHERE order_date = ? ORDER BY order_no DESC LIMIT 1`,
            [todayDate],
            (err, lastOrder) => {
              if (err) {
                return rollbackWithError(
                  connection,
                  reject,
                  "Error fetching latest order_no"
                );
              }
              console.log("CART ITEMS", cartItems);
              const newOrderNo =
                lastOrder.length > 0 ? Number(lastOrder[0].order_no) + 1 : 1;
              const orderTotal = parseFloat(
                cartItems
                  .reduce(
                    (sum, item) =>
                      sum + parseFloat(item.price) * parseFloat(item.count),
                    0
                  )
                  .toFixed(2) // Restrict to 2 decimal places
              );
              console.log(
                "======> NEW ORDER NUMBER",
                newOrderNo,
                "ORDER TOTAL",
                orderTotal,
                todayDate
              );

              connection.query(
                `INSERT INTO order_management.order_master (order_no, userid, order_date, order_total, status) VALUES (?, ?, ?, ?, ?)`,
                [newOrderNo, userid, todayDate, orderTotal, "pending"],
                (err, orderResult) => {
                  console.log(
                    "INSERT ORDER MASTER QUERY FIRED",
                    err,
                    orderResult
                  );
                  if (err || !orderResult.insertId) {
                    return rollbackWithError(
                      connection,
                      reject,
                      "Error inserting into order_master"
                    );
                  }

                  const orderId = orderResult.insertId;
                  console.log("ORDER ID", orderId);
                  insertCartItems(connection, orderId, cartItems)
                    .then(() => {
                      connection.commit((err) => {
                        if (err) {
                          return rollbackWithError(
                            connection,
                            reject,
                            "Transaction commit failed"
                          );
                        }
                        connection.release();
                        resolve({
                          code: 200,
                          status: "success",
                          message: "Order created successfully",
                          order_id: orderId,
                          order_no: newOrderNo,
                          order_date: todayDate,
                          order_total: orderTotal,
                        });
                      });
                    })
                    .catch(() =>
                      rollbackWithError(
                        connection,
                        reject,
                        "Error inserting into order_cart"
                      )
                    );
                }
              );
            }
          );
        } catch (error) {
          rollbackWithError(
            connection,
            reject,
            "Unexpected error while creating order"
          );
        }
      });
    });
  });
};

const insertCartItems = (connection, orderId, cartItems) => {
  console.log("INSERT CART ITEMS", orderId, cartItems);
  return Promise.all(
    cartItems.map((item) => {
      return new Promise((resolve, reject) => {
        connection.query(
          `INSERT INTO order_management.order_cart (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`,
          [orderId, item.product_id, item.count, item.price],
          (err) => {
            if (err) return reject(err);
            resolve();
          }
        );
      });
    })
  );
};

const rollbackWithError = (connection, reject, message) => {
  connection.rollback(() => connection.release());
  reject({
    code: 500,
    status: "error",
    message,
  });
};

module.exports = { createOrder };
