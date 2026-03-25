const express = require("express");
const router = express.Router();
const AuditRequest = require("../models/AuditRequest");
const Vendor = require("../models/Vendor");
const { protect: auth } = require("../middleware/auth");

const statusDisplayMap = {
  pending: "Pending Review",
  accepted: "Accepted - In Progress",
  completed: "Completed",
  rejected: "Declined",
};

// @route   POST /api/audit-requests
// @desc    Create a new audit request
// @access  Private (Approved Studio Users only)
router.post("/", auth, async (req, res) => {
  try {
    const { user } = req;

    // Validate user authorization
    if (user.role !== "STUDIO" || user.status !== "APPROVED") {
      return res.status(403).json({
        message: "Only approved studio users can request audits",
      });
    }

    const {
      vendorId,
      sectionName,
      itemName,
      itemType,
      isAnonymous = false,
      message = "",
    } = req.body;

    // Validate required fields
    if (!vendorId || !sectionName || !itemName || !itemType) {
      return res.status(400).json({
        message:
          "Vendor ID, section name, item name, and item type are required",
      });
    }

    // Validate itemType
    if (!["unverified", "nonvalidated"].includes(itemType)) {
      return res.status(400).json({
        message: "Item type must be 'unverified' or 'nonvalidated'",
      });
    }

    // Check if vendor exists
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        message: "Vendor not found",
      });
    }

    // Check daily quota
    const quotaCheck = await AuditRequest.checkDailyQuota(user._id);
    if (!quotaCheck.canRequest) {
      return res.status(429).json({
        message: `Daily request limit reached. You can make ${quotaCheck.remaining} more requests today.`,
        quota: quotaCheck,
      });
    }

    // Check for recent duplicate requests (prevent spam)
    const isDuplicate = await AuditRequest.checkRecentDuplicate(
      user._id,
      vendorId,
      sectionName,
      itemName,
    );

    if (isDuplicate) {
      return res.status(409).json({
        message:
          "You have already requested audit for this item recently. Please wait 24 hours before requesting again.",
      });
    }

    // Create audit request
    const auditRequest = new AuditRequest({
      requesterId: user._id,
      requesterName: user.name,
      requesterCompany: user.company,
      requesterEmail: user.email,
      vendorId: vendorId,
      vendorName: vendor.name,
      sectionName: sectionName,
      itemName: itemName,
      itemType: itemType,
      isAnonymous: isAnonymous,
      message: message.trim(),
    });

    await auditRequest.save();

    // Get updated quota after successful request
    const updatedQuota = await AuditRequest.checkDailyQuota(user._id);

    // TODO: Add email notification service here
    // EmailService.notifyVendorNewAuditRequest(auditRequest);

    res.status(201).json({
      message: "Audit request submitted successfully",
      request: {
        id: auditRequest._id,
        vendorName: auditRequest.vendorName,
        sectionName: auditRequest.sectionName,
        itemName: auditRequest.itemName,
        status: auditRequest.status,
        createdAt: auditRequest.createdAt,
      },
      quota: updatedQuota,
    });
  } catch (error) {
    console.error("Error creating audit request:", error);
    res.status(500).json({
      message: "Failed to create audit request",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// @route   GET /api/audit-requests/quota
// @desc    Get user's current request quota status
// @access  Private (Studio Users only)
router.get("/quota", auth, async (req, res) => {
  try {
    const { user } = req;

    if (user.role !== "STUDIO") {
      return res.status(403).json({
        message: "Only studio users can check request quota",
      });
    }

    const quota = await AuditRequest.checkDailyQuota(user._id);

    res.json({
      quota: quota,
      resetTime: new Date().setHours(24, 0, 0, 0), // Next midnight
    });
  } catch (error) {
    console.error("Error checking quota:", error);
    res.status(500).json({
      message: "Failed to check request quota",
    });
  }
});

// @route   GET /api/audit-requests/my-requests
// @desc    Get current user's audit requests with pagination
// @access  Private (Studio Users only)
router.get("/my-requests", auth, async (req, res) => {
  try {
    const { user } = req;

    if (user.role !== "STUDIO") {
      return res.status(403).json({
        message: "Only studio users can view their requests",
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [requests, totalCount] = await Promise.all([
      AuditRequest.find({ requesterId: user._id })
        .populate("vendorId", "name slug")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditRequest.countDocuments({ requesterId: user._id }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      requests: requests.map((req) => ({
        id: req._id,
        vendor: req.vendorId,
        vendorName: req.vendorName,
        sectionName: req.sectionName,
        itemName: req.itemName,
        itemType: req.itemType,
        status: req.status,
        statusDisplay: statusDisplayMap[req.status] || req.status,
        isAnonymous: req.isAnonymous,
        message: req.message,
        adminReply: req.adminNotes || "",
        createdAt: req.createdAt,
        statusUpdatedAt: req.statusUpdatedAt,
      })),
      pagination: {
        page,
        limit,
        totalPages,
        totalCount,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching user requests:", error);
    res.status(500).json({
      message: "Failed to fetch your requests",
    });
  }
});

// @route   GET /api/audit-requests (Admin only)
// @desc    Get all audit requests for admin dashboard
// @access  Private (Admin only)
router.get("/", auth, async (req, res) => {
  try {
    const { user } = req;

    if (user.role !== "ADMIN") {
      return res.status(403).json({
        message: "Admin access required",
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status;
    const vendorId = req.query.vendorId;

    // Build filter query
    const filter = {};
    if (
      status &&
      ["pending", "accepted", "completed", "rejected"].includes(status)
    ) {
      filter.status = status;
    }
    if (vendorId) {
      filter.vendorId = vendorId;
    }

    const [requests, totalCount] = await Promise.all([
      AuditRequest.find(filter)
        .populate("requesterId", "name company email")
        .populate("vendorId", "name slug")
        .populate("statusUpdatedBy", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditRequest.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      requests,
      pagination: {
        page,
        limit,
        totalPages,
        totalCount,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      summary: {
        pending: await AuditRequest.countDocuments({ status: "pending" }),
        accepted: await AuditRequest.countDocuments({ status: "accepted" }),
        completed: await AuditRequest.countDocuments({ status: "completed" }),
        rejected: await AuditRequest.countDocuments({ status: "rejected" }),
      },
    });
  } catch (error) {
    console.error("Error fetching audit requests:", error);
    res.status(500).json({
      message: "Failed to fetch audit requests",
    });
  }
});

module.exports = router;
