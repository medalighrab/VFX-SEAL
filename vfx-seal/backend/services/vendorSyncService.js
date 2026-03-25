"use strict";

const Vendor = require("../models/Vendor");
const { getVendors } = require("./odooService");

const CACHE_MAX_AGE_MS = Number(
  process.env.VENDOR_CACHE_MAX_AGE_MS || 10 * 60 * 1000,
);

let syncPromise = null;

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

const normalizeSize = (value) => {
  const raw = String(value || "")
    .trim()
    .toLowerCase();

  if (["micro", "small", "medium", "large"].includes(raw)) {
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  const numeric = Number(String(value || "").replace(/[^0-9]/g, ""));
  if (!Number.isNaN(numeric) && numeric > 0) {
    if (numeric <= 10) return "Micro";
    if (numeric <= 50) return "Small";
    if (numeric <= 250) return "Medium";
    return "Large";
  }

  return "Small";
};

const normalizeBadge = (value) => {
  const raw = String(value || "None")
    .trim()
    .toLowerCase();
  if (raw === "gold") return "Gold";
  if (raw === "silver") return "Silver";
  if (raw === "bronze") return "Bronze";
  return "None";
};

const normalizeServices = (services) =>
  Array.isArray(services)
    ? services.map((s) => String(s || "").trim()).filter(Boolean)
    : [];

const toVendorDoc = (odooVendor) => {
  const odooId = Number(odooVendor?.odooId);
  const name = String(odooVendor?.name || "").trim() || `Odoo Vendor ${odooId}`;
  const slugBase =
    normalizeSlug(odooVendor?.slug || name) || `vendor-${odooId}`;

  return {
    name,
    slug: `${slugBase}-${odooId}`,
    logo: String(odooVendor?.logo || ""),
    country: String(odooVendor?.country || "Unknown"),
    size: normalizeSize(odooVendor?.size || odooVendor?.teamSize),
    foundedYear:
      Number.isFinite(Number(odooVendor?.foundedYear)) &&
      Number(odooVendor?.foundedYear) > 0
        ? Number(odooVendor?.foundedYear)
        : undefined,
    website: String(odooVendor?.website || ""),
    shortDescription: String(odooVendor?.shortDescription || ""),
    services: normalizeServices(odooVendor?.services),
    badgeVOE: normalizeBadge(odooVendor?.badgeVOE),
    globalScore: Number.isFinite(Number(odooVendor?.globalScore))
      ? Math.max(0, Math.min(10, Number(odooVendor.globalScore)))
      : 0,
    source: "odoo",
    odooId,
    lastSyncedAt: new Date(),
  };
};

const getCacheState = async () => {
  const [count, latest] = await Promise.all([
    Vendor.countDocuments({ source: "odoo" }),
    Vendor.findOne({ source: "odoo", lastSyncedAt: { $ne: null } })
      .sort({ lastSyncedAt: -1 })
      .select("lastSyncedAt")
      .lean(),
  ]);

  const lastSyncedAt = latest?.lastSyncedAt
    ? new Date(latest.lastSyncedAt)
    : null;
  const stale =
    !lastSyncedAt || Date.now() - lastSyncedAt.getTime() > CACHE_MAX_AGE_MS;

  return { count, lastSyncedAt, stale };
};

const syncVendorsFromOdoo = async ({ bypassOdooCache = true } = {}) => {
  if (syncPromise) {
    return syncPromise;
  }

  syncPromise = (async () => {
    const startedAt = Date.now();
    console.log("[VendorSync] Starting Odoo -> Mongo sync...");

    let vendorsFromOdoo;
    try {
      vendorsFromOdoo = await getVendors({ bypassCache: bypassOdooCache });
    } catch (odooError) {
      console.error("[VendorSync] Odoo fetch failed:", odooError.message);

      // Don't fail if cache exists - use stale cache instead of breaking API
      const state = await getCacheState();
      if (state.count > 0) {
        console.warn(
          "[VendorSync] Odoo down but cache exists, using stale cache",
        );
        return {
          upserted: 0,
          removed: 0,
          durationMs: Date.now() - startedAt,
          usedStaleCache: true,
          message: "Using stale vendor cache due to Odoo unavailability",
        };
      }

      // No cache exists and Odoo failed - propagate error
      throw odooError;
    }

    const valid = vendorsFromOdoo
      .filter((v) => Number.isFinite(Number(v?.odooId)) && Number(v.odooId) > 0)
      .map(toVendorDoc);

    if (valid.length === 0) {
      console.warn("[VendorSync] No valid Odoo vendors to sync.");
      return { upserted: 0, removed: 0, durationMs: Date.now() - startedAt };
    }

    const now = new Date();
    const bulkOps = valid.map((vendor) => ({
      updateOne: {
        filter: { odooId: vendor.odooId },
        update: {
          $set: {
            ...vendor,
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
          },
        },
        upsert: true,
      },
    }));

    const ids = valid.map((v) => v.odooId);

    const [bulkResult, removeResult] = await Promise.all([
      Vendor.bulkWrite(bulkOps, { ordered: false }),
      Vendor.deleteMany({ source: "odoo", odooId: { $nin: ids } }),
    ]);

    const durationMs = Date.now() - startedAt;
    const upserted =
      (bulkResult?.upsertedCount || 0) + (bulkResult?.modifiedCount || 0);
    const removed = removeResult?.deletedCount || 0;

    console.log(
      `[VendorSync] Sync complete. upserted/updated=${upserted}, removed=${removed}, duration=${durationMs}ms`,
    );

    return { upserted, removed, durationMs };
  })();

  try {
    return await syncPromise;
  } finally {
    syncPromise = null;
  }
};

const triggerBackgroundSync = () => {
  syncVendorsFromOdoo({ bypassOdooCache: true }).catch((error) => {
    console.error("[VendorSync] Background sync failed:", error.message);
  });
};

const ensureVendorCacheWarm = async () => {
  const state = await getCacheState();

  // Cache is warm and not stale - just return
  if (state.count > 0 && !state.stale) {
    return;
  }

  // Cache is empty - must sync (blocking call)
  if (state.count === 0) {
    const result = await syncVendorsFromOdoo({ bypassOdooCache: true });

    // Even if stale cache was used, check if we got any data
    const afterSync = await getCacheState();
    if (afterSync.count === 0) {
      throw new Error(
        "Failed to populate vendor cache: Odoo unavailable and no cached data",
      );
    }
    return;
  }

  // Cache is stale but exists - trigger background sync (non-blocking)
  if (state.stale) {
    triggerBackgroundSync();
  }
};

module.exports = {
  syncVendorsFromOdoo,
  ensureVendorCacheWarm,
  getCacheState,
};
