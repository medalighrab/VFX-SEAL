"use strict";

/**
 * vendor.controller.js — Controller for Odoo-backed vendor listing.
 *
 * This is READ-ONLY. No Odoo writes occur here.
 * Filtering and pagination are applied in-process on the fetched Odoo data
 * so the frontend hook (useVendors) doesn't need to change its call contract.
 */

const { Op } = require("sequelize");
const {
  Vendor,
  VendorService,
  FavoriteVendor,
  VendorAssessment,
  AssessmentSkill,
} = require("../models");
const { toVendorIdentifier } = require("../utils/vendorIdentifier");
const {
  ensureVendorCacheWarm,
  getCacheState,
  syncVendorsFromOdoo,
} = require("../services/vendorSyncService");

const normalizeSlug = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * GET /api/odoo/vendors[?filtersOnly=true&search=&country=&size=&badge=&page=1&limit=20]
 *
 * Returns vendor data fetched live from Odoo with server-side filtering/pagination.
 * Response shape matches the existing MongoDB vendor endpoint so useVendors works unchanged.
 */
const toClientVendor = (vendor) => {
  const plain = vendor?.toJSON ? vendor.toJSON() : vendor;

  return {
    ...plain,
    _id: toVendorIdentifier(plain),
    services: Array.isArray(plain.servicesList)
      ? plain.servicesList.map((item) => item.serviceName)
      : plain.services || [],
    assessment: Array.isArray(plain.assessmentSections)
      ? plain.assessmentSections.map((section) => {
        const skills = Array.isArray(section.skills) ? section.skills : [];
        return {
          sectionName: section.sectionName,
          score: section.score,
          validatedSkills: skills
            .filter((s) => s.skillType === "validated")
            .map((s) => s.skillName),
          unverifiedSkills: skills
            .filter((s) => s.skillType === "unverified")
            .map((s) => s.skillName),
          nonValidatedSkills: skills
            .filter((s) => s.skillType === "nonValidated")
            .map((s) => s.skillName),
        };
      })
      : [],
    pdfReport: {
      filePath: plain.pdfReportFilePath || "",
      visibility: plain.pdfReportVisibility || "private",
    },
  };
};

const parseFavoriteIds = (favoriteVendors) => {
  const odooIds = [];
  const localIds = [];

  (favoriteVendors || []).forEach((rawId) => {
    const value = String(rawId || "").trim();
    if (!value) return;

    if (value.startsWith("odoo_")) {
      const parsed = Number(value.slice(5));
      if (Number.isFinite(parsed)) {
        odooIds.push(parsed);
      }
      return;
    }

    if (value.startsWith("local_")) {
      const parsed = Number(value.slice(6));
      if (Number.isFinite(parsed)) {
        localIds.push(parsed);
      }
    }
  });

  return { odooIds, localIds };
};

exports.getVendorsFromOdoo = async (req, res) => {
  try {
    const {
      search,
      country,
      size,
      badge,
      page = 1,
      limit = 20,
      filtersOnly,
      favoriteOnly,
    } = req.query;

    await ensureVendorCacheWarm();

    const allForFilters = await Vendor.findAll({
      where: { source: "odoo" },
      include: [{
        model: VendorService,
        as: "servicesList",
        attributes: ["serviceName"],
      }],
      attributes: ["country", "size", "badgeVOE"],
      raw: false,
    });

    const countries = [
      ...new Set(allForFilters.map((v) => v.country).filter(Boolean)),
    ].sort();
    const sizes = [
      ...new Set(allForFilters.map((v) => v.size).filter(Boolean)),
    ].sort();
    const badges = [
      ...new Set(allForFilters.map((v) => v.badgeVOE).filter(Boolean)),
    ].sort();
    const services = [
      ...new Set(
        allForFilters
          .flatMap((v) =>
            Array.isArray(v.servicesList)
              ? v.servicesList.map((item) => item.serviceName)
              : [],
          )
          .filter(Boolean),
      ),
    ].sort();

    const filters = { countries, sizes, badges, services };

    // filtersOnly=true is used by the hook on initial load to populate the sidebar
    if (filtersOnly === "true") {
      return res.json({ filters });
    }

    const where = { source: "odoo" };
    const andConditions = [];

    if (String(favoriteOnly).toLowerCase() === "true") {
      const favorites = await FavoriteVendor.findAll({
        where: { userId: req.user.id },
        attributes: ["vendorIdentifier"],
        raw: true,
      });
      const { odooIds, localIds } = parseFavoriteIds(
        favorites.map((item) => item.vendorIdentifier),
      );

      if (odooIds.length === 0 && localIds.length === 0) {
        return res.json({
          vendors: [],
          total: 0,
          page: 1,
          totalPages: 1,
          filters,
        });
      }

      const favoriteConditions = [];
      if (odooIds.length > 0) favoriteConditions.push({ odooId: { [Op.in]: odooIds } });
      if (localIds.length > 0) favoriteConditions.push({ id: { [Op.in]: localIds } });
      andConditions.push({ [Op.or]: favoriteConditions });
    }

    if (search && search.trim()) {
      andConditions.push({
        [Op.or]: [
          { name: { [Op.like]: `%${search.trim()}%` } },
          { country: { [Op.like]: `%${search.trim()}%` } },
          { shortDescription: { [Op.like]: `%${search.trim()}%` } },
        ],
      });
    }

    if (country) {
      where.country = {
        [Op.in]: country
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
      };
    }

    if (size) {
      where.size = {
        [Op.in]: size
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
    }

    if (badge) {
      where.badgeVOE = {
        [Op.in]: badge
          .split(",")
          .map((b) => b.trim())
          .filter(Boolean),
      };
    }

    if (andConditions.length > 0) {
      where[Op.and] = andConditions;
    }

    const total = await Vendor.count({ where });
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const vendorsFromDb = await Vendor.findAll({
      where,
      include: [
        {
          model: VendorService,
          as: "servicesList",
          attributes: ["serviceName"],
          required: false,
        },
        {
          model: VendorAssessment,
          as: "assessmentSections",
          required: false,
          include: [
            {
              model: AssessmentSkill,
              as: "skills",
              attributes: ["skillName", "skillType"],
              required: false,
            },
          ],
        },
      ],
      order: [
        ["badgeVOE", "DESC"],
        ["globalScore", "DESC"],
        ["name", "ASC"],
      ],
      offset: skip,
      limit: limitNum,
    });

    const vendors = vendorsFromDb.map(toClientVendor);

    return res.json({
      vendors,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      filters, // always included for convenience
    });
  } catch (error) {
    console.error("[Odoo] getVendorsFromOdoo failed:", error.message);

    return res.status(503).json({
      success: false,
      message: "Vendor service temporarily unavailable",
    });
  }
};

/**
 * GET /api/odoo/vendors/:slug
 *
 * Returns one vendor from Mongo cache by slug (indexed lookup).
 */
exports.getVendorBySlugFromOdoo = async (req, res) => {
  try {
    const slug = normalizeSlug(req.params.slug);
    if (!slug) {
      return res.status(400).json({ message: "Invalid vendor slug" });
    }

    await ensureVendorCacheWarm();

    const vendor = await Vendor.findOne({
      where: {
        source: "odoo",
        slug: { [Op.like]: slug },
      },
      include: [
        {
          model: VendorService,
          as: "servicesList",
          attributes: ["serviceName"],
          required: false,
        },
      ],
    });

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    return res.json({ vendor: toClientVendor(vendor) });
  } catch (error) {
    console.error("[Odoo] getVendorBySlugFromOdoo failed:", error.message);
    return res.status(503).json({
      success: false,
      message: "Vendor service temporarily unavailable",
    });
  }
};

exports.syncVendorsCache = async (req, res) => {
  try {
    const result = await syncVendorsFromOdoo({ bypassOdooCache: true });
    const cacheState = await getCacheState();

    return res.json({
      message: "Vendor cache sync completed",
      result,
      cacheState,
    });
  } catch (error) {
    console.error("[VendorSync] Manual sync failed:", error.message);
    return res.status(503).json({
      success: false,
      message: "Vendor sync failed",
      error: error.message,
    });
  }
};
