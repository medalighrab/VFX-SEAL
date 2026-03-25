require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const connectDB = require("./config/db");

// Import routes
const authRoutes = require("./routes/auth");
const vendorRoutes = require("./routes/vendors");
const adminRoutes = require("./routes/admin");
const feedbackRoutes = require("./routes/feedbacks");
const notificationRoutes = require("./routes/notifications");
const contactRoutes = require("./routes/contact");
const auditRequestRoutes = require("./routes/auditRequests");
const odooRoutes = require("./routes/vendor.route");
const favoriteRoutes = require("./routes/favorites");
const { syncVendorsFromOdoo } = require("./services/vendorSyncService");

const app = express();
const server = http.createServer(app);

// Dynamic CORS origin validation
const corsOriginHandler = (origin, callback) => {
  // Static allowed origins
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:5177",
    "http://localhost:5178",
    "http://localhost:5179",
    "http://localhost:5180",
    "http://localhost:3000",
    "https://vfx-seal.vercel.app",
  ];

  // Allow requests with no origin (mobile apps, server-to-server)
  if (!origin) {
    return callback(null, true);
  }

  // Check static allowed origins
  if (allowedOrigins.includes(origin)) {
    return callback(null, true);
  }

  // Allow any Vercel preview domain
  if (origin.endsWith(".vercel.app")) {
    return callback(null, true);
  }

  // Block all other origins
  callback(new Error("Not allowed by CORS"));
};

// Socket.io setup with dynamic CORS
const io = new Server(server, {
  cors: {
    origin: corsOriginHandler,
    credentials: true,
  },
});

// Make io accessible in routes
app.set("io", io);

// Socket.io authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication required"));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    return next(new Error("Invalid token"));
  }
});

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log(`🔌 Socket connected: user ${socket.userId}`);

  // Join user-specific room for targeted notifications
  socket.join(`user_${socket.userId}`);

  socket.on("disconnect", () => {
    console.log(`🔌 Socket disconnected: user ${socket.userId}`);
  });
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(
  cors({
    origin: corsOriginHandler,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (logos only — PDFs are served via protected endpoint)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/odoo", odooRoutes);
app.use("/api/feedbacks", feedbackRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/audit-requests", auditRequestRoutes);
app.use("/api/favorites", favoriteRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 VFX Seal API running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`   Socket.io: enabled`);
  console.log(
    `   Vendor sync: enabled (interval: ${Number(process.env.VENDOR_SYNC_INTERVAL_MS || 15 * 60 * 1000) / 1000}s)`,
  );

  // Warm Odoo vendor cache in background so user requests read from Mongo quickly.
  // This is non-blocking - server will listen even if sync fails or takes time
  syncVendorsFromOdoo({ bypassOdooCache: true })
    .then((result) => {
      console.log("[VendorSync] Startup sync successful:", result);
    })
    .catch((error) => {
      console.error("[VendorSync] Startup sync failed:", error.message);
      console.error(
        "[VendorSync] API will use stale cache if available, or return 503 for vendor endpoints",
      );
    });

  const syncIntervalMs = Number(
    process.env.VENDOR_SYNC_INTERVAL_MS || 15 * 60 * 1000,
  );
  setInterval(() => {
    syncVendorsFromOdoo({ bypassOdooCache: true })
      .then((result) => {
        if (result.usedStaleCache) {
          console.warn("[VendorSync] Using stale cache:", result.message);
        } else {
          console.log(
            `[VendorSync] Scheduled sync complete: ${result.upserted} upserted, ${result.removed} removed`,
          );
        }
      })
      .catch((error) => {
        console.error("[VendorSync] Scheduled sync failed:", error.message);
      });
  }, syncIntervalMs);
});
