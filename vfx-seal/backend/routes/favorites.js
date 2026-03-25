const express = require("express");
const User = require("../models/User");
const { protect, requireApproved } = require("../middleware/auth");

const router = express.Router();

const normalizeVendorId = (value) => String(value || "").trim();

// GET /api/favorites/vendors
router.get("/vendors", protect, requireApproved, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("favoriteVendors");
    const favorites = Array.isArray(user?.favoriteVendors)
      ? user.favoriteVendors
      : [];

    return res.json({ favorites });
  } catch (error) {
    console.error("Favorites list error:", error);
    return res.status(500).json({ message: "Failed to load favorites" });
  }
});

// POST /api/favorites/vendors/:vendorId
router.post(
  "/vendors/:vendorId",
  protect,
  requireApproved,
  async (req, res) => {
    try {
      const vendorId = normalizeVendorId(req.params.vendorId);
      if (!vendorId) {
        return res.status(400).json({ message: "Vendor ID is required" });
      }

      const user = await User.findByIdAndUpdate(
        req.user._id,
        { $addToSet: { favoriteVendors: vendorId } },
        { new: true },
      ).select("favoriteVendors");

      return res.json({
        message: "Vendor added to favorites",
        favorites: user?.favoriteVendors || [],
      });
    } catch (error) {
      console.error("Add favorite error:", error);
      return res.status(500).json({ message: "Failed to save favorite" });
    }
  },
);

// DELETE /api/favorites/vendors/:vendorId
router.delete(
  "/vendors/:vendorId",
  protect,
  requireApproved,
  async (req, res) => {
    try {
      const vendorId = normalizeVendorId(req.params.vendorId);
      if (!vendorId) {
        return res.status(400).json({ message: "Vendor ID is required" });
      }

      const user = await User.findByIdAndUpdate(
        req.user._id,
        { $pull: { favoriteVendors: vendorId } },
        { new: true },
      ).select("favoriteVendors");

      return res.json({
        message: "Vendor removed from favorites",
        favorites: user?.favoriteVendors || [],
      });
    } catch (error) {
      console.error("Remove favorite error:", error);
      return res.status(500).json({ message: "Failed to remove favorite" });
    }
  },
);

module.exports = router;
