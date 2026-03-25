const express = require("express");
const mongoose = require("mongoose");
const slugify = require("slugify");
const Feedback = require("../models/Feedback");
const Notification = require("../models/Notification");
const User = require("../models/User");
const Vendor = require("../models/Vendor");
const { protect } = require("../middleware/auth");
const {
  moderateContent,
  filterFeedbacksForDisplay,
} = require("../services/moderationService");
const router = express.Router();

const normalizeVendorRef = (value) =>
  slugify(String(value || ""), { lower: true, strict: true });

const resolveVendorForFeedback = async ({
  vendorId,
  vendorSlug,
  vendorName,
  createIfMissing = false,
}) => {
  const normalizedSlug = normalizeVendorRef(
    vendorSlug || vendorId || vendorName,
  );
  const normalizedNameSlug = normalizeVendorRef(vendorName);

  if (mongoose.Types.ObjectId.isValid(vendorId)) {
    const byId = await Vendor.findById(vendorId);
    if (byId) return byId;
  }

  if (normalizedSlug) {
    const bySlug = await Vendor.findOne({ slug: normalizedSlug });
    if (bySlug) return bySlug;
  }

  if (normalizedNameSlug) {
    const byNameSlug = await Vendor.findOne({ slug: normalizedNameSlug });
    if (byNameSlug) return byNameSlug;
  }

  if (!createIfMissing) return null;

  const fallbackName = String(
    vendorName || vendorSlug || vendorId || "Vendor",
  ).trim();
  const fallbackSlug =
    normalizedSlug ||
    normalizedNameSlug ||
    normalizeVendorRef(fallbackName) ||
    `vendor-${Date.now()}`;

  // Atomic upsert avoids duplicate-key races when many reviews target same Odoo vendor.
  const vendor = await Vendor.findOneAndUpdate(
    { slug: fallbackSlug },
    {
      $setOnInsert: {
        name: fallbackName || `Vendor ${fallbackSlug}`,
        slug: fallbackSlug,
        country: "Unknown",
        size: "Micro",
        badgeVOE: "None",
        globalScore: 0,
        services: [],
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    },
  );

  return vendor;
};

// POST /api/feedbacks — submit feedback (any authenticated user)
router.post("/", protect, async (req, res) => {
  try {
    const { vendorId, vendorSlug, vendorName, rating, message } = req.body;

    if (!vendorId || !rating || !message) {
      return res
        .status(400)
        .json({ message: "Vendor ID, rating, and message are required" });
    }

    if (rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ message: "Rating must be between 1 and 5" });
    }

    if (message.length > 2000) {
      return res
        .status(400)
        .json({ message: "Message must be under 2000 characters" });
    }

    let resolvedVendor;
    try {
      resolvedVendor = await resolveVendorForFeedback({
        vendorId,
        vendorSlug,
        vendorName,
        createIfMissing: true,
      });
    } catch (mappingError) {
      console.error("Submit feedback mapping error:", mappingError);
      return res.status(500).json({
        message: "Feedback vendor mapping failed",
        reason: mappingError?.message || "Unknown mapping error",
        stage: "resolveVendorForFeedback",
      });
    }

    if (!resolvedVendor?._id) {
      return res.status(400).json({ message: "Invalid vendor reference" });
    }

    // Check for existing feedback (one per studio per vendor)
    const existing = await Feedback.findOne({
      vendorId: resolvedVendor._id,
      studioId: req.user._id,
    });
    if (existing) {
      return res.status(400).json({
        message: "You have already submitted feedback for this vendor",
      });
    }

    // Moderate the content
    const moderationResult = moderateContent(message);

    const displayName = [req.user?.name, req.user?.company]
      .filter(Boolean)
      .join(" — ");

    let feedback;
    try {
      feedback = await Feedback.create({
        vendorId: resolvedVendor._id,
        studioId: req.user._id,
        studioName: displayName || req.user?.email || "User",
        rating,
        message,
        status: "PENDING", // All feedback starts as PENDING
        isFlagged: moderationResult.isFlagged,
        flagReason: moderationResult.reason,
        moderationStatus: moderationResult.isFlagged ? "flagged" : "visible",
      });
    } catch (feedbackCreateError) {
      console.error("Submit feedback create error:", feedbackCreateError);
      return res.status(500).json({
        message: "Feedback save failed",
        reason: feedbackCreateError?.message || "Unknown feedback save error",
        stage: "createFeedback",
      });
    }

    // Notify all admins
    const admins = await User.find({ role: "ADMIN" });
    for (const admin of admins) {
      const notificationType = moderationResult.isFlagged
        ? "FLAGGED_FEEDBACK"
        : "NEW_FEEDBACK";
      const notificationTitle = moderationResult.isFlagged
        ? "Flagged Feedback Detected"
        : "New Feedback Submitted";
      const notificationMessage = moderationResult.isFlagged
        ? `${req.user.name} from ${req.user.company} submitted feedback that was flagged for: ${moderationResult.reason}`
        : `${req.user.name} from ${req.user.company} submitted a ${rating}-star feedback.`;

      const notification = await Notification.create({
        userId: admin._id,
        type: notificationType,
        title: notificationTitle,
        message: notificationMessage,
        relatedId: feedback._id,
        link: `/admin?tab=feedbacks&feedbackId=${feedback._id}`,
      });

      // Emit socket event
      const io = req.app.get("io");
      if (io) {
        io.to(`user_${admin._id}`).emit("notification", notification);
      }
    }

    console.log(
      `📧 [EMAIL STUB] ${moderationResult.isFlagged ? "Flagged" : "New"} feedback notification sent to admins`,
    );

    res.status(201).json({
      feedback,
      moderated: moderationResult.isFlagged,
      message: moderationResult.isFlagged
        ? "Feedback submitted and is under review due to content policies."
        : "Feedback submitted successfully!",
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: "You have already submitted feedback for this vendor",
      });
    }
    console.error("Submit feedback error:", error);
    res.status(500).json({
      message: "Server error",
      reason: error?.message || "Unknown error",
      stage: "submitFeedback",
    });
  }
});

// GET /api/feedbacks/vendor/:vendorId — get approved + rejected feedbacks for a vendor
router.get("/vendor/:vendorId", protect, async (req, res) => {
  try {
    const resolvedVendor = await resolveVendorForFeedback({
      vendorId: req.params.vendorId,
      createIfMissing: false,
    });

    if (!resolvedVendor?._id) {
      return res.json({
        feedbacks: [],
        avgRating: 0,
        totalRatings: 0,
        myFeedback: null,
      });
    }

    // Fetch APPROVED and REJECTED feedbacks (PENDING hidden from public)
    // Non-deleted feedbacks only unless admin is viewing in admin context
    const feedbacks = await Feedback.find({
      vendorId: resolvedVendor._id,
      status: { $in: ["APPROVED", "REJECTED"] },
      moderationStatus: { $ne: "deleted" },
    }).sort({ createdAt: -1 });

    // Filter feedbacks based on user role and moderation status
    const filteredFeedbacks = filterFeedbacksForDisplay(feedbacks, false); // Always false here since this is public view

    // Calculate average rating from APPROVED and non-flagged only
    const approvedFeedbacks = feedbacks.filter(
      (f) => f.status === "APPROVED" && !f.isFlagged,
    );
    const totalRatings = approvedFeedbacks.length;
    const avgRating =
      totalRatings > 0
        ? approvedFeedbacks.reduce((sum, f) => sum + f.rating, 0) / totalRatings
        : 0;

    // Check if current user already submitted
    const myFeedback = await Feedback.findOne({
      vendorId: resolvedVendor._id,
      studioId: req.user._id,
    });

    res.json({
      feedbacks: filteredFeedbacks,
      avgRating: Math.round(avgRating * 10) / 10,
      totalRatings,
      myFeedback,
    });
  } catch (error) {
    console.error("Get feedbacks error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/feedbacks/vendor/:vendorId/summary — lightweight summary for vendor cards
router.get("/vendor/:vendorId/summary", protect, async (req, res) => {
  try {
    const resolvedVendor = await resolveVendorForFeedback({
      vendorId: req.params.vendorId,
      createIfMissing: false,
    });

    if (!resolvedVendor?._id) {
      return res.json({ avgRating: 0, totalRatings: 0 });
    }

    const feedbacks = await Feedback.find({
      vendorId: resolvedVendor._id,
      status: "APPROVED",
    }).select("rating");

    const totalRatings = feedbacks.length;
    const avgRating =
      totalRatings > 0
        ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / totalRatings
        : 0;

    res.json({
      avgRating: Math.round(avgRating * 10) / 10,
      totalRatings,
    });
  } catch (error) {
    console.error("Get feedback summary error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/feedbacks/summaries — bulk summaries for all vendors (for vendor listing)
router.get("/summaries", protect, async (req, res) => {
  try {
    const { vendorIds } = req.query; // Optional: only get summaries for specific vendors

    const matchStage = {
      status: "APPROVED",
      isFlagged: false,
      moderationStatus: { $ne: "deleted" },
    };

    // If specific vendor IDs provided, filter by them
    if (vendorIds) {
      try {
        const ids = vendorIds
          .split(",")
          .map((id) => id.trim())
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
          .map((id) => new mongoose.Types.ObjectId(id));

        if (ids.length > 0) {
          matchStage.vendorId = { $in: ids };
        }
      } catch (error) {
        console.error("Error parsing vendor IDs:", error);
        // Continue without filtering if parsing fails
      }
    }

    const summaries = await Feedback.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$vendorId",
          avgRating: { $avg: "$rating" },
          totalRatings: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 1,
          avgRating: { $round: ["$avgRating", 1] },
          totalRatings: 1,
        },
      },
    ]);

    const summaryMap = {};
    summaries.forEach((s) => {
      summaryMap[s._id.toString()] = {
        avgRating: s.avgRating,
        totalRatings: s.totalRatings,
      };
    });

    res.json({ summaries: summaryMap });
  } catch (error) {
    console.error("Get feedback summaries error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ADMIN: GET /api/feedbacks/admin/pending — all pending feedbacks (including flagged)
router.get("/admin/pending", protect, async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { status = "PENDING" } = req.query;
    const filter = status === "ALL" ? {} : { status };

    // Don't filter out deleted items for admin view
    const feedbacks = await Feedback.find(filter)
      .populate("vendorId", "name slug")
      .sort({ createdAt: -1 });

    // Add flagged count to response
    const flaggedCount = await Feedback.countDocuments({
      isFlagged: true,
      moderationStatus: "flagged",
    });

    res.json({ feedbacks, flaggedCount });
  } catch (error) {
    console.error("Admin feedbacks error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ADMIN: PATCH /api/feedbacks/:id/approve
router.patch("/:id/approve", protect, async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const feedback = await Feedback.findById(req.params.id);
    if (!feedback)
      return res.status(404).json({ message: "Feedback not found" });

    feedback.status = "APPROVED";
    await feedback.save();

    // Notify studio
    const notification = await Notification.create({
      userId: feedback.studioId,
      type: "FEEDBACK_APPROVED",
      title: "Feedback Approved",
      message: "Your feedback has been approved and is now visible publicly.",
      relatedId: feedback._id,
      link: "/vendors",
    });

    const io = req.app.get("io");
    if (io) {
      io.to(`user_${feedback.studioId}`).emit("notification", notification);
    }

    console.log(
      `📧 [EMAIL STUB] Feedback approved notification sent to studio ${feedback.studioId}`,
    );

    res.json({ message: "Feedback approved", feedback });
  } catch (error) {
    console.error("Approve feedback error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ADMIN: PATCH /api/feedbacks/:id/reject
router.patch("/:id/reject", protect, async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const feedback = await Feedback.findById(req.params.id);
    if (!feedback)
      return res.status(404).json({ message: "Feedback not found" });

    feedback.status = "REJECTED";
    feedback.adminNote = req.body.adminNote || "";
    await feedback.save();

    // Notify studio
    const notification = await Notification.create({
      userId: feedback.studioId,
      type: "FEEDBACK_REJECTED",
      title: "Feedback Rejected",
      message: req.body.adminNote
        ? `Your feedback was rejected: "${req.body.adminNote}"`
        : "Your feedback was rejected by the admin.",
      relatedId: feedback._id,
      link: "/vendors",
    });

    const io = req.app.get("io");
    if (io) {
      io.to(`user_${feedback.studioId}`).emit("notification", notification);
    }

    res.json({ message: "Feedback rejected", feedback });
  } catch (error) {
    console.error("Reject feedback error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ADMIN: DELETE /api/feedbacks/:id/delete - Delete flagged feedback
router.delete("/:id/delete", protect, async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const feedback = await Feedback.findById(req.params.id);
    if (!feedback)
      return res.status(404).json({ message: "Feedback not found" });

    // Mark as deleted instead of actually deleting to preserve audit trail
    feedback.moderationStatus = "deleted";
    await feedback.save();

    // Optionally notify the studio that their feedback was removed
    const notification = await Notification.create({
      userId: feedback.studioId,
      type: "FEEDBACK_REMOVED",
      title: "Feedback Removed",
      message: "Your feedback was removed for violating community guidelines.",
      relatedId: feedback._id,
      link: "/vendors",
    });

    const io = req.app.get("io");
    if (io) {
      io.to(`user_${feedback.studioId}`).emit("notification", notification);
    }

    res.json({ message: "Feedback deleted successfully", feedback });
  } catch (error) {
    console.error("Delete feedback error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ADMIN: PATCH /api/feedbacks/:id/unflag - Unflag flagged feedback
router.patch("/:id/unflag", protect, async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const feedback = await Feedback.findById(req.params.id);
    if (!feedback)
      return res.status(404).json({ message: "Feedback not found" });

    feedback.isFlagged = false;
    feedback.flagReason = "";
    feedback.moderationStatus = "visible";
    await feedback.save();

    res.json({ message: "Feedback unflagged successfully", feedback });
  } catch (error) {
    console.error("Unflag feedback error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
