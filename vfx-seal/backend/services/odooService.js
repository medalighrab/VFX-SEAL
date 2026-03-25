"use strict";

/**
 * odooService.js — Live READ-ONLY Odoo integration for vendors.
 *
 * Uses Odoo JSON-RPC over HTTPS.
 * All credentials are read from process.env — never hardcoded.
 * This service never writes to Odoo.
 */

const https = require("https");

const AUTH_CACHE_MS = 10 * 60 * 1000;
const FIELDS_CACHE_MS = 30 * 60 * 1000;
const VENDORS_CACHE_MS = 60 * 1000;

let authCache = { uid: null, at: 0 };
let fieldsCache = { fields: null, at: 0 };
let vendorsCache = { vendors: null, at: 0 };

function invalidateAuthCache() {
  authCache = { uid: null, at: 0 };
}

function invalidateFieldsCache() {
  fieldsCache = { fields: null, at: 0 };
}

function invalidateVendorsCache() {
  vendorsCache = { vendors: null, at: 0 };
}

function isAuthRelatedError(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("access denied") ||
    message.includes("session") ||
    message.includes("authenticate") ||
    message.includes("invalid")
  );
}

// ---------------------------------------------------------------------------
// JSON-RPC transport
// ---------------------------------------------------------------------------

/**
 * POST a JSON-RPC payload to `path` on the configured Odoo instance.
 * @param {string} path  e.g. "/jsonrpc"
 * @param {object} params  The JSON-RPC `params` body.
 * @returns {Promise<any>}  The `result` field from the JSON-RPC response.
 */
function rpcPost(path, params, rpcName = "unknown") {
  return new Promise((resolve, reject) => {
    const baseUrl = process.env.ODOO_URL;
    if (!baseUrl) {
      return reject(new Error("ODOO_URL is not configured in environment"));
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(path, baseUrl);
    } catch (e) {
      return reject(new Error(`Invalid Odoo URL config: ${e.message}`));
    }

    const body = JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      id: Date.now(),
      params,
    });

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        try {
          const text = Buffer.concat(chunks).toString("utf8");
          const contentType = String(res.headers["content-type"] || "");

          if (
            text.trim().startsWith("<") ||
            contentType.includes("text/html")
          ) {
            const preview = text.slice(0, 180).replace(/\s+/g, " ");
            return reject(
              new Error(
                `[Odoo:${rpcName}] Expected JSON-RPC but received HTML (status ${res.statusCode}, content-type: ${contentType || "n/a"}). Preview: ${preview}`,
              ),
            );
          }

          const json = JSON.parse(text);
          if (json.error) {
            // Extract deepest error message without leaking credentials
            const msg =
              json.error?.data?.message ||
              json.error?.message ||
              "Odoo JSON-RPC error";
            return reject(new Error(msg));
          }
          resolve(json.result);
        } catch (e) {
          reject(
            new Error(
              `[Odoo:${rpcName}] Failed to parse Odoo response: ${e.message}`,
            ),
          );
        }
      });
    });

    // 20-second timeout to avoid hanging server responses
    req.setTimeout(20000, () => {
      req.destroy(new Error("Odoo request timed out (20s)"));
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

/**
 * Authenticate with Odoo using API key credentials.
 * Returns the numeric uid required for subsequent execute_kw calls.
 */
async function authenticate(forceRefresh = false) {
  const { ODOO_DB, ODOO_USERNAME, ODOO_API_KEY } = process.env;

  if (
    !forceRefresh &&
    authCache.uid &&
    Date.now() - authCache.at < AUTH_CACHE_MS
  ) {
    return authCache.uid;
  }

  if (!ODOO_DB || !ODOO_USERNAME || !ODOO_API_KEY) {
    throw new Error(
      "Odoo credentials are incomplete. Check ODOO_DB, ODOO_USERNAME, ODOO_API_KEY in .env",
    );
  }

  const uid = await rpcPost(
    "/jsonrpc",
    {
      service: "common",
      method: "authenticate",
      args: [ODOO_DB, ODOO_USERNAME, ODOO_API_KEY, {}],
    },
    "authenticate",
  );

  if (!uid || typeof uid !== "number") {
    throw new Error(
      "Odoo authentication failed — no valid uid returned. Check credentials.",
    );
  }

  authCache = { uid, at: Date.now() };
  console.log("[Odoo] Authenticated successfully, uid:", uid);
  return uid;
}

// ---------------------------------------------------------------------------
// Field resolution — defensive: probe what actually exists on res.partner
// ---------------------------------------------------------------------------

/**
 * Fields we WANT to read from Odoo res.partner.
 * Some may not exist on every Odoo instance — we probe first and skip missing ones.
 *
 * Note: image_128 is used instead of image_1920 for performance
 * (full-size images per vendor would create very large responses).
 */
const DESIRED_FIELDS = [
  "name",
  "website",
  "country_id",
  "city",
  "image_128", // lightweight thumbnail for card rendering
  "x_studio_account_1",
  "x_studio_team",
  "x_studio_fondation",
  "x_studio_service",
  "x_studio_language",
  "x_studio_notes",
  "x_studio_score",
];

/**
 * Probe res.partner fields via fields_get and return only fields that exist.
 * Falls back to the full desired list if fields_get itself fails.
 */
async function resolveAvailableFields(db, uid, apiKey) {
  if (fieldsCache.fields && Date.now() - fieldsCache.at < FIELDS_CACHE_MS) {
    return fieldsCache.fields;
  }

  try {
    const fieldDefs = await rpcPost(
      "/jsonrpc",
      {
        service: "object",
        method: "execute_kw",
        args: [
          db,
          uid,
          apiKey,
          "res.partner",
          "fields_get",
          [],
          { attributes: ["string"] },
        ],
      },
      "fields_get",
    );

    const available = DESIRED_FIELDS.filter((fieldName) => {
      const exists = Object.prototype.hasOwnProperty.call(fieldDefs, fieldName);
      if (!exists) {
        console.warn(
          `[Odoo] Field missing on res.partner: "${fieldName}" — will be skipped`,
        );
      }
      return exists;
    });

    // id is always available and always needed
    if (!available.includes("id")) available.unshift("id");

    fieldsCache = { fields: available, at: Date.now() };

    console.log(
      `[Odoo] Confirmed ${available.length} available fields: ${available.join(", ")}`,
    );
    return available;
  } catch (e) {
    console.warn(
      `[Odoo] fields_get probe failed (${e.message}) — using full desired field list`,
    );
    return ["id", ...DESIRED_FIELDS];
  }
}

// ---------------------------------------------------------------------------
// Data mapping
// ---------------------------------------------------------------------------

/** Generate a URL-safe slug from a vendor name */
function nameToSlug(str) {
  return String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Map a raw Odoo res.partner record to the clean vendor shape used by the frontend.
 * All fields are normalized defensively — missing values become empty string or null.
 */
function mapRecord(record) {
  const safe = (v) => (v && v !== false ? String(v).trim() : "");
  const safeNum = (v) =>
    v !== false && v != null && v !== "" ? Number(v) : null;

  // country_id is a Many2one => [id, display_name] or false
  let country = "";
  if (Array.isArray(record.country_id) && record.country_id.length === 2) {
    country = String(record.country_id[1]);
  }

  // Use only lightweight thumbnail to keep API responses small.
  let logo = null;
  const imageData = record.image_128;
  if (imageData && imageData !== false) {
    logo = `data:image/png;base64,${imageData}`;
  }

  const name = safe(record.name);
  const serviceRaw = safe(record.x_studio_service);

  // Services may be a comma/semicolon-separated string — split into array
  const services = serviceRaw
    ? serviceRaw
        .split(/[,;/]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const teamRaw = safe(record.x_studio_team);
  const score = safeNum(record.x_studio_score);

  return {
    // Shape matches the existing MongoDB vendor schema used by VendorsPage
    _id: `odoo_${record.id}`,
    slug: nameToSlug(name) || `vendor-${record.id}`,
    name,
    logo,
    country,
    city: safe(record.city),
    teamSize: teamRaw,
    // "size" field kept for filter compatibility (mapped from team label if possible)
    size: teamRaw || null,
    foundedYear: safeNum(record.x_studio_fondation),
    services,
    shortDescription: safe(record.x_studio_notes),
    languages: safe(record.x_studio_language),
    score,
    globalScore: score !== null ? score : 0,
    website: safe(record.website),
    badgeVOE: "None", // not stored in Odoo; badge system is managed locally
    source: "odoo",
    odooId: record.id,
  };
}

function odooFieldText(value) {
  if (value === false || value == null) return "";

  if (Array.isArray(value)) {
    // Many2one often arrives as [id, label]
    if (value.length === 2 && typeof value[1] === "string") {
      return value[1].trim();
    }

    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .join(" ");
  }

  return String(value).trim();
}

function isEligibleVendorRecord(record) {
  const accountRaw = odooFieldText(record.x_studio_account_1).toLowerCase();
  const serviceRaw = odooFieldText(record.x_studio_service).toLowerCase();

  const normalizeToken = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");

  const accountNormalized = normalizeToken(accountRaw);

  // Strict business rule: account must be only "2-Account".
  // Odoo selection fields may arrive as the key (e.g. "3") or as the label ("2-Account").
  const accountOk =
    accountNormalized === "2account" || accountNormalized === "3";

  const serviceTokens = serviceRaw
    .split(/[,;/|]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const serviceOk =
    serviceRaw === "vendor" ||
    serviceTokens.includes("vendor") ||
    serviceRaw.includes("vendor");

  return accountOk && serviceOk;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch all published vendors from Odoo res.partner.
 * Filters applied on Odoo side:
 *   - x_studio_account_1 = "2-Account"
 *   - x_studio_service ilike "Vendor"
 *
 * Both conditions are required together (logical AND).
 * If a required field is missing from schema, returns an empty list to avoid
 * showing non-vendor/non-studio accounts.
 *
 * @returns {Promise<object[]>}  Array of mapped vendor objects.
 */
async function getVendors(options = {}) {
  const { bypassCache = false } = options;
  const { ODOO_DB, ODOO_API_KEY } = process.env;

  if (
    !bypassCache &&
    vendorsCache.vendors &&
    Date.now() - vendorsCache.at < VENDORS_CACHE_MS
  ) {
    return vendorsCache.vendors;
  }

  const fetchOnce = async ({ refreshAuth = false } = {}) => {
    const uid = await authenticate(refreshAuth);

    // Field metadata should be refreshed after forced auth refresh.
    if (refreshAuth) {
      invalidateFieldsCache();
    }

    const fields = await resolveAvailableFields(ODOO_DB, uid, ODOO_API_KEY);

    // Build domain with strict eligibility rules.
    // x_studio_published is intentionally not used unless explicitly confirmed.
    const domain = [];
    const hasServiceField = fields.includes("x_studio_service");
    const hasAccountField = fields.includes("x_studio_account_1");

    if (!hasServiceField || !hasAccountField) {
      const missing = [
        !hasServiceField ? "x_studio_service" : null,
        !hasAccountField ? "x_studio_account_1" : null,
      ]
        .filter(Boolean)
        .join(", ");

      console.warn(
        `[Odoo] Required vendor eligibility field(s) missing: ${missing}. Returning 0 vendors.`,
      );
      return [];
    }

    // Keep query compatible with Odoo selection key storage and apply strict local check.
    // In many Odoo databases, selection value for "2-Account" is stored as key "3".
    domain.push(["x_studio_account_1", "=", "3"]);
    domain.push(["x_studio_service", "=", "Vendor"]);

    console.log(
      `[Odoo] Querying res.partner with domain: ${JSON.stringify(domain)}`,
    );

    const records = await rpcPost(
      "/jsonrpc",
      {
        service: "object",
        method: "execute_kw",
        args: [
          ODOO_DB,
          uid,
          ODOO_API_KEY,
          "res.partner",
          "search_read",
          [domain],
          { fields, limit: 500 },
        ],
      },
      "search_read",
    );

    if (!Array.isArray(records)) {
      throw new Error(`Unexpected Odoo response type: ${typeof records}`);
    }

    return records;
  };

  try {
    const records = await fetchOnce();
    console.log(`[Odoo] Fetched ${records.length} vendor record(s).`);

    // Authoritative guard: keep only records that match BOTH eligibility labels.
    const eligibleRecords = records.filter(isEligibleVendorRecord);
    console.log(
      `[Odoo] Eligible vendor records after strict local filter: ${eligibleRecords.length}/${records.length}.`,
    );

    const mapped = eligibleRecords.map(mapRecord);
    vendorsCache = { vendors: mapped, at: Date.now() };
    return mapped;
  } catch (error) {
    if (!isAuthRelatedError(error)) {
      if (vendorsCache.vendors) {
        console.warn(
          `[Odoo] Returning cached vendors due to fetch error: ${error.message}`,
        );
        return vendorsCache.vendors;
      }
      throw error;
    }

    console.warn(
      `[Odoo] Auth/session issue detected (${error.message}). Re-authenticating and retrying once...`,
    );

    invalidateAuthCache();
    invalidateFieldsCache();
    invalidateVendorsCache();

    const records = await fetchOnce({ refreshAuth: true });
    console.log(
      `[Odoo] Fetched ${records.length} vendor record(s) after retry.`,
    );

    const eligibleRecords = records.filter(isEligibleVendorRecord);
    console.log(
      `[Odoo] Eligible vendor records after retry strict local filter: ${eligibleRecords.length}/${records.length}.`,
    );

    const mapped = eligibleRecords.map(mapRecord);
    vendorsCache = { vendors: mapped, at: Date.now() };
    return mapped;
  }
}

module.exports = { getVendors };
