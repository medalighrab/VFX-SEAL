"use strict";

/**
 * vendor.route.js — Route definitions for the live Odoo vendor feed.
 *
 * Mounted in server.js at:  /api/odoo
 * Full path exposed:         GET /api/odoo/vendors
 *
 * Protected: only logged-in, approved users can access vendor data.
 * This matches the access level of the existing MongoDB vendor route.
 */

const express = require("express");
const router = express.Router();
const {
  protect,
  requireAdmin,
  requireApproved,
} = require("../middleware/auth");
const {
  getVendorsFromOdoo,
  getVendorBySlugFromOdoo,
  syncVendorsCache,
} = require("../controllers/vendor.controller");

// GET /api/odoo/vendors
router.get("/vendors", protect, requireApproved, getVendorsFromOdoo);
router.get("/vendors/:slug", protect, requireApproved, getVendorBySlugFromOdoo);
router.post("/vendors/sync", protect, requireAdmin, syncVendorsCache);

module.exports = router;
