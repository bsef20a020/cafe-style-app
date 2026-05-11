const express = require("express");
const MenuItem = require("../models/MenuItem");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = { available: true };
    if (req.query.category && req.query.category !== "all") {
      query.category = req.query.category;
    }

    const items = await MenuItem.find(query).sort({ category: 1, sortOrder: 1, name: 1 });
    const categories = await MenuItem.distinct("category", { available: true });

    res.json({
      ok: true,
      data: {
        items,
        categories: categories.sort()
      }
    });
  })
);

module.exports = router;
