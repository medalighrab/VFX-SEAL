const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { protect } = require("../middleware/auth");
const {
  sendPasswordResetEmail,
  sendNewRegistrationNotificationEmail,
} = require("../config/email");
const router = express.Router();

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const gmailRegex = /^[^\s@]+@gmail\.com$/i;

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, company, email, password, country, roleInCompany, linkedin } =
      req.body;

    // Validation
    if (
      !name ||
      !company ||
      !email ||
      !password ||
      !country ||
      !roleInCompany
    ) {
      return res
        .status(400)
        .json({ message: "All required fields must be provided" });
    }

    if (!gmailRegex.test(email)) {
      return res
        .status(400)
        .json({ message: "Registration requires a valid Gmail address" });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "An account with this email already exists" });
    }

    // Create user with PENDING status
    const user = await User.create({
      name,
      company,
      email: email.toLowerCase(),
      passwordHash: password, // Pre-save hook will hash it
      country,
      roleInCompany,
      linkedin: linkedin || "",
      role: "STUDIO",
      status: "PENDING",
    });

    // Notify admin in background so registration response is not blocked by SMTP latency.
    sendNewRegistrationNotificationEmail({
      adminEmail:
        process.env.ADMIN_NOTIFICATION_EMAIL || process.env.EMAIL_USER,
      user,
    }).catch((emailError) => {
      console.error(
        "Failed to send admin registration notification:",
        emailError,
      );
    });

    res.status(201).json({
      message:
        "Account created successfully. Your account is pending admin approval.",
      user: user.toJSON(),
    });
  } catch (error) {
    console.error("Registration error:", error);
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "An account with this email already exists" });
    }
    res.status(500).json({ message: "Server error during registration" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user._id);

    res.json({
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
});

// POST /api/auth/approval-login/:token
router.post("/approval-login/:token", async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ message: "Access token is required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res
        .status(400)
        .json({ message: "Invalid or expired approval link" });
    }

    if (decoded.purpose !== "approval-access") {
      return res
        .status(400)
        .json({ message: "Invalid approval token purpose" });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.status !== "APPROVED") {
      return res.status(403).json({ message: "Account is not approved yet" });
    }

    const authToken = generateToken(user._id);

    return res.json({
      token: authToken,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error("Approval login error:", error);
    return res
      .status(500)
      .json({ message: "Server error during approval login" });
  }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({
        message:
          "If an account with that email exists, you will receive a password reset email.",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save to database
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    // Send email
    try {
      await sendPasswordResetEmail(user.email, resetToken);
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      // Clear the reset token if email fails
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();
      return res
        .status(500)
        .json({ message: "Failed to send reset email. Please try again." });
    }

    res.json({
      message:
        "If an account with that email exists, you will receive a password reset email.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error. Please try again." });
  }
});

// POST /api/auth/reset-password/:token
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    // Validate input
    if (!password || !confirmPassword) {
      return res
        .status(400)
        .json({ message: "Password and confirm password are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }

    // Update password
    user.passwordHash = password; // Pre-save hook will hash it
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    // Generate new login token
    const authToken = generateToken(user._id);

    res.json({
      message: "Password reset successfully",
      token: authToken,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error. Please try again." });
  }
});

// GET /api/auth/me — get current user profile
router.get("/me", protect, async (req, res) => {
  res.json({ user: req.user });
});

// PUT /api/auth/profile — update current user profile
router.put("/profile", protect, async (req, res) => {
  try {
    const {
      name,
      email,
      company,
      country,
      roleInCompany,
      linkedin,
      currentPassword,
      newPassword,
    } = req.body;

    // Find the current user
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Validate inputs
    if (!name || name.trim().length < 1) {
      return res.status(400).json({ message: "Name is required" });
    }

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Valid email is required" });
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

    // If changing password, validate current password
    if (newPassword) {
      if (!currentPassword) {
        return res
          .status(400)
          .json({ message: "Current password required to set new password" });
      }

      const isCurrentPasswordValid =
        await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }

      if (newPassword.length < 6) {
        return res
          .status(400)
          .json({ message: "New password must be at least 6 characters" });
      }

      user.passwordHash = newPassword; // Will be hashed by pre-save middleware
    }

    // Update user fields
    user.name = name.trim();
    user.email = email.toLowerCase().trim();
    if (company) user.company = company.trim();
    if (country) user.country = country.trim();
    if (roleInCompany) user.roleInCompany = roleInCompany.trim();
    if (linkedin !== undefined) user.linkedin = linkedin.trim();

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: user.toJSON(),
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
