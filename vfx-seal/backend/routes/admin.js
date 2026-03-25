const express = require("express");
const User = require("../models/User");
const Feedback = require("../models/Feedback");
const ContactMessage = require("../models/ContactMessage");
const { protect, requireAdmin } = require("../middleware/auth");
const { sendApprovalEmail } = require("../config/email");
const router = express.Router();

const unreadByAdminFilter = {
  $and: [
    { status: "NEW" },
    {
      $or: [
        { senderType: "STUDIO" },
        { senderType: { $exists: false } },
        { senderType: null },
      ],
    },
    {
      $or: [
        { direction: { $ne: "OUTBOUND" } },
        { direction: { $exists: false } },
        { direction: null },
      ],
    },
    {
      $or: [{ adminReadAt: null }, { adminReadAt: { $exists: false } }],
    },
  ],
};

// All admin routes require authentication + admin role
router.use(protect, requireAdmin);

// GET /api/admin/users — list all studio users
router.get("/users", async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = { role: "STUDIO" };

    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { company: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(filter).sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    console.error("Admin users list error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH /api/admin/users/:id/approve
router.patch("/users/:id/approve", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "ADMIN")
      return res.status(400).json({ message: "Cannot modify admin users" });

    user.status = "APPROVED";
    await user.save();

    // Send email in background so approval response is not blocked by SMTP latency.
    sendApprovalEmail({
      email: user.email,
      firstName: user.name?.split(" ")?.[0],
    })
      .then(() => {
        console.log(
          `[Admin] Approval email queued successfully for ${user.email}`,
        );
      })
      .catch((emailError) => {
        console.error("Approval email send failed:", emailError);
      });

    return res.json({
      message: "User approved successfully",
      user,
      emailQueued: true,
    });
  } catch (error) {
    console.error("Approve user error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH /api/admin/users/:id/reject
router.patch("/users/:id/reject", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "ADMIN")
      return res.status(400).json({ message: "Cannot modify admin users" });

    user.status = "REJECTED";
    await user.save();

    console.log(`📧 [EMAIL STUB] Rejection email sent to: ${user.email}`);

    res.json({ message: "User rejected", user });
  } catch (error) {
    console.error("Reject user error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH /api/admin/users/:id/block
router.patch("/users/:id/block", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "ADMIN")
      return res.status(400).json({ message: "Cannot modify admin users" });

    user.status = "REJECTED";
    await user.save();

    console.log(
      `📧 [EMAIL STUB] Account blocked notification sent to: ${user.email}`,
    );

    res.json({ message: "User blocked", user });
  } catch (error) {
    console.error("Block user error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/admin/users/:id/delete
router.delete("/users/:id/delete", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "ADMIN")
      return res.status(400).json({ message: "Cannot delete admin users" });

    await User.findByIdAndDelete(req.params.id);

    console.log(`🗑️ [ADMIN] User deleted: ${user.email}`);

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/admin/stats — dashboard stats
router.get("/stats", async (req, res) => {
  try {
    const Vendor = require("../models/Vendor");

    const [
      totalStudios,
      pendingStudios,
      approvedStudios,
      rejectedStudios,
      totalVendors,
      pendingFeedbacks,
      totalFeedbacks,
      newMessages,
    ] = await Promise.all([
      User.countDocuments({ role: "STUDIO" }),
      User.countDocuments({ role: "STUDIO", status: "PENDING" }),
      User.countDocuments({ role: "STUDIO", status: "APPROVED" }),
      User.countDocuments({ role: "STUDIO", status: "REJECTED" }),
      Vendor.countDocuments(),
      Feedback.countDocuments({ status: "PENDING" }),
      Feedback.countDocuments(),
      ContactMessage.countDocuments(unreadByAdminFilter),
    ]);

    res.json({
      totalStudios,
      pendingStudios,
      approvedStudios,
      rejectedStudios,
      totalVendors,
      pendingFeedbacks,
      totalFeedbacks,
      newMessages,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/admin/users/:id — update studio profile
router.put("/users/:id", async (req, res) => {
  try {
    const { name, email, company, country, roleInCompany, linkedin } = req.body;

    // Find the studio user
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent modifying admin users
    if (user.role === "ADMIN") {
      return res.status(400).json({ message: "Cannot modify admin users" });
    }

    // Validate inputs
    if (!name || name.trim().length < 1) {
      return res.status(400).json({ message: "Name is required" });
    }

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Valid email is required" });
    }

    if (!company || company.trim().length < 1) {
      return res.status(400).json({ message: "Company is required" });
    }

    if (!country || country.trim().length < 1) {
      return res.status(400).json({ message: "Country is required" });
    }

    // Check if email is already taken by another user
    if (email !== user.email) {
      const existingUser = await User.findOne({
        email,
        _id: { $ne: user._id },
      });
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }
    }

    // Update user fields
    user.name = name.trim();
    user.email = email.toLowerCase().trim();
    user.company = company.trim();
    user.country = country.trim();
    if (roleInCompany) user.roleInCompany = roleInCompany.trim();
    if (linkedin !== undefined) user.linkedin = linkedin.trim();

    await user.save();

    res.json({
      message: "Studio profile updated successfully",
      user: user.toJSON(),
    });
  } catch (error) {
    console.error("Update studio profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
