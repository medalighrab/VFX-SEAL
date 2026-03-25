const express = require("express");
const Notification = require("../models/Notification");
const { protect } = require("../middleware/auth");
const router = express.Router();

function resolveNotificationLink(notification, user) {
  const relatedId = notification.relatedId?.toString?.() || "";
  const rawLink =
    typeof notification.link === "string" ? notification.link.trim() : "";
  const isGenericAdminLink =
    rawLink === "/admin" || rawLink === "/admin/" || rawLink === "/admin?";

  if (rawLink) {
    if (user?.role === "ADMIN" && relatedId) {
      const isMessageNotif =
        notification.type === "NEW_CONTACT" ||
        notification.type === "CONTACT_REPLY";
      const isFeedbackNotif =
        notification.type === "NEW_FEEDBACK" ||
        notification.type === "FLAGGED_FEEDBACK" ||
        notification.type === "FEEDBACK_APPROVED" ||
        notification.type === "FEEDBACK_REJECTED" ||
        notification.type === "FEEDBACK_REMOVED";

      if (
        isMessageNotif &&
        (isGenericAdminLink ||
          (rawLink.startsWith("/admin") && !rawLink.includes("messageId=")))
      ) {
        return `/admin?tab=messages&messageId=${relatedId}`;
      }

      if (
        isFeedbackNotif &&
        (isGenericAdminLink ||
          (rawLink.startsWith("/admin") && !rawLink.includes("feedbackId=")))
      ) {
        return `/admin?tab=feedbacks&feedbackId=${relatedId}`;
      }
    }

    return rawLink;
  }

  switch (notification.type) {
    case "CONTACT_REPLY":
      return relatedId ? `/messages?messageId=${relatedId}` : "/messages";
    case "NEW_CONTACT":
      if (user?.role === "ADMIN") {
        return relatedId
          ? `/admin?tab=messages&messageId=${relatedId}`
          : "/admin?tab=messages";
      }
      return relatedId ? `/messages?messageId=${relatedId}` : "/messages";
    case "FLAGGED_FEEDBACK":
    case "FEEDBACK_APPROVED":
    case "FEEDBACK_REJECTED":
    case "FEEDBACK_REMOVED":
      if (user?.role === "ADMIN") {
        return relatedId
          ? `/admin?tab=feedbacks&feedbackId=${relatedId}`
          : "/admin?tab=feedbacks";
      }
      return "/vendors";
    case "NEW_FEEDBACK":
      if (user?.role === "ADMIN") {
        return relatedId
          ? `/admin?tab=feedbacks&feedbackId=${relatedId}`
          : "/admin?tab=feedbacks";
      }
      return "/vendors";
    case "AUDIT_REQUEST_UPDATE":
    case "VENDOR_VERIFICATION_UPDATE":
      return "/messages";
    case "SYSTEM":
      return relatedId ? `/messages?messageId=${relatedId}` : "/messages";
    default:
      return user?.role === "ADMIN" ? "/admin" : "/";
  }
}

// GET /api/notifications — get current user's notifications
router.get("/", protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      read: false,
    });

    const normalized = notifications.map((notification) => {
      const item = notification.toObject
        ? notification.toObject()
        : notification;
      return {
        ...item,
        link: resolveNotificationLink(item, req.user),
      };
    });

    res.json({ notifications: normalized, unreadCount });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH /api/notifications/read-all — mark all as read
router.patch("/read-all", protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, read: false },
      { read: true },
    );
    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Mark notifications read error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH /api/notifications/:id/read — mark single as read
router.patch("/:id/read", protect, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true },
      { new: true },
    );
    if (!notification)
      return res.status(404).json({ message: "Notification not found" });
    res.json({ notification });
  } catch (error) {
    console.error("Mark notification read error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
