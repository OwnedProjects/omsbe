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

              const newOrderNo =
                lastOrder.length > 0 ? Number(lastOrder[0].order_no) + 1 : 1;
              const orderTotal = parseFloat(
                cartItems
                  .reduce(
                    (sum, item) =>
                      sum + parseFloat(item.price) * parseFloat(item.count),
                    0
                  )
                  .toFixed(2)
              );

              connection.query(
                `INSERT INTO order_management.order_master (order_no, userid, order_date, order_total, status) VALUES (?, ?, ?, ?, ?)`,
                [newOrderNo, userid, todayDate, orderTotal, "pending"],
                (err, orderResult) => {
                  if (err || !orderResult.insertId) {
                    return rollbackWithError(
                      connection,
                      reject,
                      "Error inserting into order_master"
                    );
                  }

                  const orderId = orderResult.insertId;
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

const getPendingOrders = () => {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        return reject({
          code: 500,
          status: "error",
          message: "Database connection failed",
        });
      }

      const todayDate = new Date().toISOString().split("T")[0]; // Get today's date in YYYY-MM-DD format

      connection.query(
        `SELECT 
              om.order_id, 
              om.order_no, 
              om.userid, 
              om.order_date, 
              om.order_total, 
              oc.product_id, 
              p.product_name, 
              oc.quantity, 
              oc.price
          FROM order_management.order_master om
          JOIN order_management.order_cart oc ON om.order_id = oc.order_id
          JOIN order_management.products p ON oc.product_id = p.product_id
          WHERE om.status = 'pending' 
          AND om.order_date = ?
          ORDER BY om.order_date ASC;
        `,
        [todayDate], // Pass today's date as a parameter
        (err, results) => {
          connection.release();

          if (err) {
            return reject({
              code: 500,
              status: "error",
              message: "Error fetching today's pending orders",
            });
          }

          // Group items by order_id
          const pendingOrders = results.reduce((acc, row) => {
            const {
              order_id,
              order_no,
              userid,
              order_date,
              order_total,
              product_id,
              product_name,
              quantity,
              price,
            } = row;
            let order = acc.find((o) => o.order_id === order_id);

            if (!order) {
              order = {
                order_id,
                order_no,
                userid,
                order_date,
                order_total,
                cartItems: [],
              };
              acc.push(order);
            }

            order.cartItems.push({ product_id, quantity, price, product_name });
            return acc;
          }, []);

          resolve(pendingOrders);
        }
      );
    });
  });
};

const insertCartItems = (connection, orderId, cartItems) => {
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

const markOrderAsDone = (orderId) => {
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

        // Check if the order exists and is still pending
        connection.query(
          `SELECT status FROM order_management.order_master WHERE order_id = ?`,
          [orderId],
          (err, results) => {
            if (err) {
              return rollbackWithError(
                connection,
                reject,
                "Error fetching order status"
              );
            }

            if (results.length === 0) {
              return rollbackWithError(connection, reject, "Order not found");
            }

            if (results[0].status !== "pending") {
              return rollbackWithError(
                connection,
                reject,
                "Order is not pending"
              );
            }

            // Update order status to "done"
            connection.query(
              `UPDATE order_management.order_master SET status = 'done' WHERE order_id = ?`,
              [orderId],
              (err, updateResult) => {
                if (err || updateResult.affectedRows === 0) {
                  return rollbackWithError(
                    connection,
                    reject,
                    "Failed to update order status"
                  );
                }

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
                    message: "Order marked as done successfully",
                  });
                });
              }
            );
          }
        );
      });
    });
  });
};

const getDoneOrders = () => {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        return reject({
          code: 500,
          status: "error",
          message: "Database connection failed",
        });
      }

      const todayDate = new Date().toISOString().split("T")[0]; // Get today's date in YYYY-MM-DD format

      connection.query(
        `SELECT 
              om.order_id, 
              om.order_no, 
              om.userid, 
              om.order_date, 
              om.order_total, 
              oc.product_id, 
              p.product_name, 
              oc.quantity, 
              oc.price
          FROM order_management.order_master om
          JOIN order_management.order_cart oc ON om.order_id = oc.order_id
          JOIN order_management.products p ON oc.product_id = p.product_id
          WHERE om.status = 'done' 
          AND om.order_date = ?
          ORDER BY om.order_date ASC;
        `,
        [todayDate], // Pass today's date as a parameter
        (err, results) => {
          connection.release();

          if (err) {
            return reject({
              code: 500,
              status: "error",
              message: "Error fetching today's done orders",
            });
          }

          // Group items by order_id
          const doneOrders = results.reduce((acc, row) => {
            const {
              order_id,
              order_no,
              userid,
              order_date,
              order_total,
              product_id,
              product_name,
              quantity,
              price,
            } = row;
            let order = acc.find((o) => o.order_id === order_id);

            if (!order) {
              order = {
                order_id,
                order_no,
                userid,
                order_date,
                order_total,
                cartItems: [],
              };
              acc.push(order);
            }

            order.cartItems.push({ product_id, quantity, price, product_name });
            return acc;
          }, []);

          resolve(doneOrders);
        }
      );
    });
  });
};

// const markOrderAsClose = (orderId) => {
//   return new Promise((resolve, reject) => {
//     pool.getConnection((err, connection) => {
//       if (err) {
//         return reject({
//           code: 500,
//           status: "error",
//           message: "Database connection failed",
//         });
//       }

//       connection.beginTransaction((err) => {
//         if (err) {
//           connection.release();
//           return reject({
//             code: 500,
//             status: "error",
//             message: "Transaction initialization failed",
//           });
//         }

//         // Check if the order exists and is still pending
//         connection.query(
//           `SELECT status FROM order_management.order_master WHERE order_id = ?`,
//           [orderId],
//           (err, results) => {
//             if (err) {
//               connection.release();
//               return reject({
//                 code: 500,
//                 status: "error",
//                 message: "Error fetching order status",
//               });
//             }

//             if (results.length === 0) {
//               connection.release();
//               return reject({
//                 code: 404,
//                 status: "error",
//                 message: "Order not found",
//               });
//             }

//             if (results[0].status !== "pending") {
//               // ✅ Changed from 'done' to 'pending'
//               connection.release();
//               return reject({
//                 code: 400,
//                 status: "error",
//                 message: `Order is not in a pending state, current state: ${results[0].status}`,
//               });
//             }

//             // Update order status to "completed"
//             connection.query(
//               `UPDATE order_management.order_master SET status = 'completed' WHERE order_id = ?`,
//               [orderId],
//               (err, updateResult) => {
//                 if (err || updateResult.affectedRows === 0) {
//                   connection.rollback(() => {
//                     connection.release();
//                     return reject({
//                       code: 500,
//                       status: "error",
//                       message: "Failed to update order status",
//                     });
//                   });
//                   return;
//                 }

//                 connection.commit((err) => {
//                   if (err) {
//                     connection.rollback(() => {
//                       connection.release();
//                       return reject({
//                         code: 500,
//                         status: "error",
//                         message: "Transaction commit failed",
//                       });
//                     });
//                     return;
//                   }

//                   connection.release();
//                   resolve({
//                     code: 200,
//                     status: "success",
//                     message: "Order Closed Successfully",
//                   });
//                 });
//               }
//             );
//           }
//         );
//       });
//     });
//   });
// };

const markOrderAsClose = (orderId) => {
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

        // 🔹 Fetch `order_no` along with `status`
        connection.query(
          `SELECT order_no, status FROM order_management.order_master WHERE order_id = ?`,
          [orderId],
          (err, results) => {
            if (err) {
              return rollbackWithError(
                connection,
                reject,
                "Error fetching order details"
              );
            }

            if (results.length === 0) {
              return rollbackWithError(connection, reject, "Order not found");
            }

            const { order_no, status } = results[0];

            if (status !== "done") {
              return rollbackWithError(connection, reject, "Order is not done");
            }

            // 🔹 Update order status to "completed"
            connection.query(
              `UPDATE order_management.order_master SET status = 'completed' WHERE order_id = ?`,
              [orderId],
              (err, updateResult) => {
                if (err || updateResult.affectedRows === 0) {
                  return rollbackWithError(
                    connection,
                    reject,
                    "Failed to update order status"
                  );
                }

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
                    message: "Order Closed Successfully",
                    order_id: orderId,
                    order_no, // ✅ Return order_no as well
                  });
                });
              }
            );
          }
        );
      });
    });
  });
};

module.exports = {
  createOrder,
  getPendingOrders,
  markOrderAsDone,
  getDoneOrders,
  markOrderAsClose,
};
