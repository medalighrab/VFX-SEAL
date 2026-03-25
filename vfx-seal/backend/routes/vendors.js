const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Vendor = require("../models/Vendor");
const {
  protect,
  requireApproved,
  requireAdmin,
} = require("../middleware/auth");
const router = express.Router();

// Multer config for file uploads (logo + PDF)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "..", "uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === "logo") {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Logo must be an image file"), false);
    }
  } else if (file.fieldname === "pdfFile") {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Report must be a PDF file"), false);
    }
  } else {
    cb(null, true);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});

// GET /api/vendors — list vendors with filters (protected, approved)
router.get("/", protect, requireApproved, async (req, res) => {
  try {
    const {
      country,
      size,
      badge,
      search,
      page = 1,
      limit = 20,
      filtersOnly,
    } = req.query;

    // If only filter data is requested (for initial load)
    if (filtersOnly === "true") {
      const filterData = await Vendor.aggregate([
        {
          $group: {
            _id: null,
            countries: { $addToSet: "$country" },
            sizes: { $addToSet: "$size" },
            badges: { $addToSet: "$badgeVOE" },
            services: { $addToSet: { $arrayElemAt: ["$services", 0] } },
          },
        },
        {
          $project: {
            _id: 0,
            countries: { $sortArray: { input: "$countries", sortBy: 1 } },
            sizes: { $sortArray: { input: "$sizes", sortBy: 1 } },
            badges: { $sortArray: { input: "$badges", sortBy: 1 } },
            services: { $sortArray: { input: "$services", sortBy: 1 } },
          },
        },
      ]);

      return res.json({
        filters: filterData[0] || {
          countries: [],
          sizes: [],
          badges: [],
          services: [],
        },
      });
    }

    const filter = {};
    if (country) filter.country = { $in: country.split(",") };
    if (size) filter.size = { $in: size.split(",") };
    if (badge) filter.badgeVOE = { $in: badge.split(",") };
    if (search) {
      // Use text index for better performance
      filter.$text = { $search: search };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Single aggregation pipeline for vendors and count
    const pipeline = [
      { $match: filter },
      {
        $facet: {
          vendors: [
            { $sort: { badgeVOE: -1, globalScore: -1, name: 1 } },
            { $skip: skip },
            { $limit: parseInt(limit) },
            {
              $project: {
                name: 1,
                slug: 1,
                logo: 1,
                country: 1,
                size: 1,
                foundedYear: 1,
                website: 1,
                shortDescription: 1,
                services: { $slice: ["$services", 3] }, // Limit services for performance
                badgeVOE: 1,
                globalScore: 1,
                createdAt: 1,
              },
            },
          ],
          total: [{ $count: "count" }],
        },
      },
    ];

    const [result] = await Vendor.aggregate(pipeline);
    const vendors = result.vendors;
    const total = result.total[0]?.count || 0;

    res.json({
      vendors,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("Vendor list error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/vendors/:slug — vendor detail (protected, approved)
router.get("/:slug", protect, requireApproved, async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ slug: req.params.slug });
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }
    res.json({ vendor });
  } catch (error) {
    console.error("Vendor detail error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/vendors/:id/pdf — secure PDF download (protected, approved)
router.get("/:id/pdf", protect, requireApproved, async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    if (!vendor.pdfReport || !vendor.pdfReport.filePath) {
      return res.status(404).json({ message: "No PDF report available" });
    }

    // Check visibility
    if (
      vendor.pdfReport.visibility === "private" &&
      req.user.role !== "ADMIN"
    ) {
      return res
        .status(403)
        .json({ message: "This report is not available for download" });
    }

    const filePath = path.join(__dirname, "..", vendor.pdfReport.filePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "PDF file not found on server" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${vendor.slug}-voe-report.pdf"`,
    );
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (error) {
    console.error("PDF download error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/vendors — create vendor (admin only)
router.post(
  "/",
  protect,
  requireAdmin,
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "pdfFile", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const vendorData = { ...req.body };

      // Parse JSON fields sent as strings
      if (typeof vendorData.services === "string") {
        vendorData.services = JSON.parse(vendorData.services);
      }
      if (typeof vendorData.assessment === "string") {
        vendorData.assessment = JSON.parse(vendorData.assessment);
      }
      if (typeof vendorData.globalScore === "string") {
        vendorData.globalScore = parseFloat(vendorData.globalScore);
      }
      if (typeof vendorData.foundedYear === "string") {
        vendorData.foundedYear = parseInt(vendorData.foundedYear);
      }

      // Handle file uploads
      if (req.files && req.files.logo) {
        vendorData.logo = "/uploads/" + req.files.logo[0].filename;
      }
      if (req.files && req.files.pdfFile) {
        vendorData.pdfReport = {
          filePath: "uploads/" + req.files.pdfFile[0].filename,
          visibility: vendorData.pdfVisibility || "members",
        };
      }
      delete vendorData.pdfVisibility;

      const vendor = await Vendor.create(vendorData);
      res.status(201).json({ vendor });
    } catch (error) {
      console.error("Create vendor error:", error);
      res.status(500).json({ message: "Server error creating vendor" });
    }
  },
);

// PUT /api/vendors/:id — update vendor (admin only)
router.put(
  "/:id",
  protect,
  requireAdmin,
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "pdfFile", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const vendor = await Vendor.findById(req.params.id);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      const updateData = { ...req.body };

      // Parse JSON fields
      if (typeof updateData.services === "string") {
        updateData.services = JSON.parse(updateData.services);
      }
      if (typeof updateData.assessment === "string") {
        updateData.assessment = JSON.parse(updateData.assessment);
      }
      if (typeof updateData.globalScore === "string") {
        updateData.globalScore = parseFloat(updateData.globalScore);
      }
      if (typeof updateData.foundedYear === "string") {
        updateData.foundedYear = parseInt(updateData.foundedYear);
      }

      // Handle file uploads
      if (req.files && req.files.logo) {
        updateData.logo = "/uploads/" + req.files.logo[0].filename;
      }
      if (req.files && req.files.pdfFile) {
        updateData.pdfReport = {
          filePath: "uploads/" + req.files.pdfFile[0].filename,
          visibility:
            updateData.pdfVisibility ||
            vendor.pdfReport?.visibility ||
            "members",
        };
      } else if (updateData.pdfVisibility) {
        updateData.pdfReport = {
          ...vendor.pdfReport?.toObject(),
          visibility: updateData.pdfVisibility,
        };
      }
      delete updateData.pdfVisibility;

      const updated = await Vendor.findByIdAndUpdate(
        req.params.id,
        updateData,
        {
          new: true,
          runValidators: true,
        },
      );

      res.json({ vendor: updated });
    } catch (error) {
      console.error("Update vendor error:", error);
      res.status(500).json({ message: "Server error updating vendor" });
    }
  },
);

// DELETE /api/vendors/:id — delete vendor (admin only)
router.delete("/:id", protect, requireAdmin, async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndDelete(req.params.id);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }
    res.json({ message: "Vendor deleted successfully" });
  } catch (error) {
    console.error("Delete vendor error:", error);
    res.status(500).json({ message: "Server error deleting vendor" });
  }
});

module.exports = router;
