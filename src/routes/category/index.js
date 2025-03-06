const express = require("express");
const db = require("../../controllers/category/categoryController");
const router = express.Router();

router.get("/getactivecategories", async (req, res, next) => {
  try {
    let results = await db.getActiveCategories();
    return res.json(results);
  } catch (err) {
    return res.json(err); // Pass the error to the error handling middleware
  }
});

router.get("/getproductsbycategory", async (req, res, next) => {
  try {
    let results = await db.getProductsByCategory(req.query.categoryid);
    return res.json(results);
  } catch (err) {
    return res.json(err); // Pass the error to the error handling middleware
  }
});

module.exports = router;
