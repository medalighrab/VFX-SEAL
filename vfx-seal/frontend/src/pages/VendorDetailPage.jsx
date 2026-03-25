import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import FeedbackSection from "../components/FeedbackSection";
import RequestAuditModal from "../components/RequestAuditModal";
import {
  FiAward,
  FiCircle,
  FiPlay,
  FiFileText,
  FiCheck,
  FiMapPin,
  FiUsers,
  FiExternalLink,
  FiAlertTriangle,
  FiStar,
} from "react-icons/fi";
import { FaTrophy } from "react-icons/fa";

const BADGE_ICONS = {
  Gold: <FaTrophy className="badge-icon gold" />,
  Silver: <FiAward className="badge-icon silver" />,
  Bronze: <FiCircle className="badge-icon bronze" />,
  Blue: <FiCircle className="badge-icon blue" />,
  None: "—",
};

const VENDOR_SNAPSHOT_CACHE_KEY = "vendor_snapshot_cache";

const DEFAULT_ASSESSMENT_SECTION_NAMES = [
  "Governance & Legal",
  "Finance & Stability",
  "Production Capability",
  "Pipeline & Technology",
  "Security & Compliance",
  "Quality Assurance",
  "Delivery & Operations",
  "Team & Talent",
  "Communication & Collaboration",
  "Business Continuity",
  "Innovation & R&D",
];

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

const ensureArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return String(value)
    .split(/[,;/]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const getVendorSnapshotBySlug = (slug) => {
  try {
    const cache = JSON.parse(
      sessionStorage.getItem(VENDOR_SNAPSHOT_CACHE_KEY) || "{}",
    );

    if (cache[slug]) return cache[slug];

    const normalized = normalizeSlug(slug);
    const matchedKey = Object.keys(cache).find(
      (key) => normalizeSlug(key) === normalized,
    );
    return matchedKey ? cache[matchedKey] : null;
  } catch {
    return null;
  }
};

const buildFallbackAssessment = (vendor) => {
  const declaredSkills = ensureArray(vendor?.services);
  const declaredPrimary = declaredSkills.slice(0, 3);
  const declaredSecondary = declaredSkills.slice(3);
  const baseScore = Number(vendor?.globalScore) || 0;

  return DEFAULT_ASSESSMENT_SECTION_NAMES.map((sectionName, index) => ({
    sectionName,
    score: Number(baseScore.toFixed(1)),
    validatedSkills: index === 0 ? declaredPrimary : [],
    unverifiedSkills: index === 0 ? declaredSecondary : [],
    nonValidatedSkills: ["Pending VOE validation"],
  }));
};

const normalizeVendorProfile = (rawVendor) => {
  if (!rawVendor) return null;

  const assessment = Array.isArray(rawVendor.assessment)
    ? rawVendor.assessment
    : [];

  const normalizedAssessment =
    assessment.length > 0
      ? assessment.map((section, index) => ({
          sectionName:
            section?.sectionName ||
            DEFAULT_ASSESSMENT_SECTION_NAMES[index] ||
            `Section ${index + 1}`,
          score: Number(section?.score ?? rawVendor.globalScore ?? 0),
          validatedSkills: ensureArray(section?.validatedSkills),
          unverifiedSkills: ensureArray(section?.unverifiedSkills),
          nonValidatedSkills: ensureArray(section?.nonValidatedSkills),
        }))
      : buildFallbackAssessment(rawVendor);

  if (normalizedAssessment.length < 11) {
    const missingSections = DEFAULT_ASSESSMENT_SECTION_NAMES.slice(
      normalizedAssessment.length,
      11,
    ).map((sectionName) => ({
      sectionName,
      score: Number(rawVendor.globalScore ?? 0),
      validatedSkills: [],
      unverifiedSkills: [],
      nonValidatedSkills: ["Pending VOE validation"],
    }));
    normalizedAssessment.push(...missingSections);
  }

  return {
    ...rawVendor,
    slug: rawVendor.slug || normalizeSlug(rawVendor.name),
    name: rawVendor.name || "Unknown Vendor",
    country: rawVendor.country || "Not specified",
    size: rawVendor.size || "Not specified",
    globalScore: Number(rawVendor.globalScore ?? 0),
    badgeVOE: rawVendor.badgeVOE || "None",
    services: ensureArray(rawVendor.services),
    assessment: normalizedAssessment.slice(0, 11),
    pdfReport: rawVendor.pdfReport || null,
  };
};

export default function VendorDetailPage() {
  const { slug } = useParams();
  const location = useLocation();
  const { user, isApproved } = useAuth();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openSections, setOpenSections] = useState({});

  // Request Audit Modal state
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditRequest, setAuditRequest] = useState({
    sectionName: "",
    itemName: "",
    itemType: "",
  });

  // Enhanced badge logic with Blue for new studios
  const getBadgeType = (vendor) => {
    if (!vendor) return "None";

    const currentYear = new Date().getFullYear();
    const isNew = vendor.foundedYear && currentYear - vendor.foundedYear < 2;

    if (isNew) return "Blue";
    return vendor.badgeVOE || "None";
  };

  const badgeClass = (badge) => (badge || "none").toLowerCase();

  const renderScoreStars = (score) => {
    const stars = Math.max(
      0,
      Math.min(5, Math.round((Number(score) || 0) / 2)),
    );
    return (
      <div
        className="stars stars-sm"
        aria-label={`Score stars: ${stars} out of 5`}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <FiStar
            key={star}
            className={`star ${star <= stars ? "filled" : ""}`}
            size={16}
          />
        ))}
      </div>
    );
  };

  useEffect(() => {
    const stateSnapshot = location.state?.vendorSnapshot || null;
    const cachedSnapshot = stateSnapshot || getVendorSnapshotBySlug(slug);

    if (cachedSnapshot) {
      const normalized = normalizeVendorProfile(cachedSnapshot);
      setVendor(normalized);
      if (normalized?.assessment?.length > 0) {
        setOpenSections({ 0: true });
      }
      setLoading(false);
    }

    const fetchVendor = async () => {
      try {
        let vendorData = null;

        try {
          const { data } = await api.get(`/vendors/${slug}`);
          vendorData = data.vendor;
        } catch (legacyErr) {
          if (legacyErr?.response?.status !== 404) {
            throw legacyErr;
          }

          const { data } = await api.get(`/odoo/vendors/${slug}`);
          vendorData = data.vendor;
        }

        if (!vendorData) {
          const { data } = await api.get("/odoo/vendors", {
            params: {
              search: String(slug || "").replace(/-/g, " "),
              page: 1,
              limit: 100,
            },
          });

          const matches = data?.vendors || [];
          const normalizedSlug = normalizeSlug(slug);
          vendorData =
            matches.find(
              (item) =>
                normalizeSlug(item.slug) === normalizedSlug ||
                normalizeSlug(item.name) === normalizedSlug,
            ) || null;
        }

        if (!vendorData) {
          throw new Error("Vendor not found");
        }

        const normalized = normalizeVendorProfile(vendorData);
        setVendor(normalized);
        setError("");
        if (normalized?.assessment?.length > 0) {
          setOpenSections({ 0: true });
        }
      } catch (err) {
        if (!cachedSnapshot) {
          setError(err.response?.data?.message || "Vendor not found");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchVendor();
  }, [slug, location.state]);

  const toggleSection = (index) => {
    setOpenSections((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const expandAll = () => {
    if (!vendor?.assessment) return;
    const allOpen = {};
    vendor.assessment.forEach((_, idx) => {
      allOpen[idx] = true;
    });
    setOpenSections(allOpen);
  };

  const collapseAll = () => {
    setOpenSections({});
  };

  const handleDownloadPdf = async () => {
    try {
      const response = await api.get(`/vendors/${vendor._id}/pdf`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" }),
      );
      window.open(url, "_blank");
    } catch (err) {
      alert(err.response?.data?.message || "Unable to access PDF report");
    }
  };

  // Handle opening audit request modal
  const handleRequestAudit = (sectionName, itemName, itemType) => {
    if (!user || !isApproved) {
      alert("You must be logged in and approved to request audits.");
      return;
    }

    setAuditRequest({
      sectionName,
      itemName,
      itemType,
    });
    setAuditModalOpen(true);
  };

  // Handle successful audit request submission
  const handleAuditSuccess = (requestData) => {
    console.log("Audit request submitted successfully:", requestData);
    // Could add a toast notification here or update UI state
  };

  const scorePercent = vendor
    ? (Number(vendor.globalScore || 0) / 10) * 100
    : 0;
  const feedbackTargetId = vendor
    ? String(vendor._id || "").startsWith("odoo_")
      ? vendor.slug
      : vendor._id
    : "";
  const canAccessPdf =
    Boolean(vendor?.pdfReport?.filePath) &&
    (vendor?.pdfReport?.visibility !== "private" || user?.role === "ADMIN");

  if (loading)
    return (
      <div className="page-wrapper">
        <div className="loading">
          <div className="spinner" />
        </div>
      </div>
    );
  if (error)
    return (
      <div className="page-wrapper">
        <div className="container">
          <Link to="/vendors" className="back-link">
            ← Back to Vendors
          </Link>
          <div className="alert alert-error">{error}</div>
        </div>
      </div>
    );

  return (
    <div className="vendor-detail-page">
      <div className="page-wrapper">
        <div className="container">
          <div className="vendor-detail fade-in">
            <Link to="/vendors" className="back-link" id="back-to-vendors">
              ← Back to Vendors
            </Link>

            {/* Header */}
            <div className="vendor-detail-header">
              <div className="vendor-detail-logo">
                {vendor.logo ? (
                  <img src={vendor.logo} alt={vendor.name} />
                ) : (
                  vendor.name.charAt(0)
                )}
              </div>
              <div className="vendor-detail-info">
                <h1 className="vendor-detail-name">
                  {vendor.name}
                  <span
                    className={`voe-badge ${badgeClass(getBadgeType(vendor))}`}
                  >
                    <span className="voe-badge-icon">
                      {BADGE_ICONS[getBadgeType(vendor)] || "—"}
                    </span>
                    {getBadgeType(vendor)}
                  </span>
                </h1>
                <div className="vendor-detail-meta">
                  <span className="vendor-detail-meta-item">
                    <FiMapPin size={14} /> {vendor.country}
                  </span>
                  <span className="vendor-detail-meta-item">
                    <FiUsers size={14} /> {vendor.size}
                  </span>
                  {vendor.foundedYear && (
                    <span className="vendor-detail-meta-item">
                      Est. {vendor.foundedYear}
                    </span>
                  )}
                  {vendor.website && (
                    <span className="vendor-detail-meta-item">
                      <FiExternalLink size={14} />{" "}
                      <a
                        href={vendor.website}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Website
                      </a>
                    </span>
                  )}
                  {vendor.demoReel && (
                    <span className="vendor-detail-meta-item">
                      <FiPlay size={16} style={{ marginRight: "4px" }} />
                      <a
                        href={vendor.demoReel}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Demo Reel
                      </a>
                    </span>
                  )}
                </div>
                {vendor.shortDescription && (
                  <p className="vendor-detail-desc">
                    {vendor.shortDescription}
                  </p>
                )}
                {vendor.services?.length > 0 && (
                  <div className="vendor-services">
                    {vendor.services.map((s) => (
                      <span className="service-tag" key={s}>
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="vendor-detail-score-container">
                <div
                  className="score-ring"
                  style={{ "--score-percent": scorePercent }}
                >
                  <div className="score-ring-inner">
                    <span className="score-ring-value">
                      {vendor.globalScore?.toFixed(1)}
                    </span>
                    <span className="score-ring-label">VOE Score</span>
                  </div>
                </div>
                {renderScoreStars(vendor.globalScore)}
              </div>
            </div>

            {/* Feedback & Rating Section — Collapsible Accordion */}
            <FeedbackSection
              vendorId={feedbackTargetId}
              vendorName={vendor.name}
              vendorSlug={vendor.slug}
            />

            {/* Assessment Sections */}
            {vendor.assessment?.length > 0 && (
              <>
                <div className="vendor-detail-section-title">
                  <FiFileText size={16} style={{ marginRight: "8px" }} />
                  VOE Assessment — {vendor.assessment.length} Sections
                </div>

                {/* Global Control Buttons */}
                <div className="assessment-controls">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={expandAll}
                  >
                    Expand All
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={collapseAll}
                  >
                    Collapse All
                  </button>
                </div>

                <div className="accordion">
                  {vendor.assessment.map((section, idx) => (
                    <div
                      className={`accordion-item ${openSections[idx] ? "open" : ""}`}
                      key={idx}
                    >
                      <div
                        className="accordion-header"
                        onClick={() => toggleSection(idx)}
                        id={`section-${idx}`}
                      >
                        <div className="accordion-header-left">
                          <span className="accordion-section-name">
                            {section.sectionName}
                          </span>
                          <span className="accordion-score">
                            {section.score.toFixed(1)} / 10
                          </span>
                        </div>
                        <span className="accordion-chevron">▼</span>
                      </div>
                      <div className="accordion-body">
                        <div className="accordion-content">
                          {section.validatedSkills?.length > 0 && (
                            <div className="skills-section">
                              <div className="skills-section-title validated">
                                <FiCheck
                                  size={14}
                                  style={{ marginRight: "4px" }}
                                />
                                Validated by VOE
                              </div>
                              <div className="skills-list">
                                {section.validatedSkills.map((s) => (
                                  <span
                                    className="skill-chip validated"
                                    key={s}
                                  >
                                    <FiCheck
                                      size={14}
                                      style={{ marginRight: "4px" }}
                                    />
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {section.unverifiedSkills?.length > 0 && (
                            <div className="skills-section">
                              <div className="skills-section-title unverified">
                                <FiAlertTriangle
                                  size={14}
                                  style={{ marginRight: "4px" }}
                                />
                                Declared — Not Verified
                              </div>
                              <div className="skills-list">
                                {section.unverifiedSkills.map((s) => (
                                  <div className="skill-item-wrapper" key={s}>
                                    <span className="skill-chip unverified">
                                      <FiAlertTriangle
                                        size={14}
                                        style={{ marginRight: "4px" }}
                                      />
                                      {s}
                                    </span>
                                    {user && isApproved && (
                                      <button
                                        className="btn btn-request btn-xs"
                                        onClick={() =>
                                          handleRequestAudit(
                                            section.sectionName,
                                            s,
                                            "unverified",
                                          )
                                        }
                                        title="Request audit for this item"
                                      >
                                        Request
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {section.nonValidatedSkills?.length > 0 && (
                            <div className="skills-section">
                              <div className="skills-section-title nonvalidated">
                                ✗ Not Validated
                              </div>
                              <div className="skills-list">
                                {section.nonValidatedSkills.map((s) => (
                                  <div className="skill-item-wrapper" key={s}>
                                    <span className="skill-chip nonvalidated">
                                      ✗ {s}
                                    </span>
                                    {user && isApproved && (
                                      <button
                                        className="btn btn-request btn-xs"
                                        onClick={() =>
                                          handleRequestAudit(
                                            section.sectionName,
                                            s,
                                            "nonvalidated",
                                          )
                                        }
                                        title="Request audit for this item"
                                      >
                                        Request
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* PDF Report */}
            {vendor.pdfReport?.filePath && (
              <div className="vendor-detail-pdf">
                <div className="vendor-detail-pdf-info">
                  <h4>📄 VOE Assessment Report</h4>
                  <p>Full detailed report for {vendor.name}</p>
                </div>
                {canAccessPdf ? (
                  <button
                    className="btn btn-primary"
                    onClick={handleDownloadPdf}
                    id="download-pdf-btn"
                  >
                    📥 View / Download PDF
                  </button>
                ) : (
                  <span className="status-badge closed">
                    Report not authorized
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Request Audit Modal */}
      <RequestAuditModal
        isOpen={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        vendor={vendor}
        sectionName={auditRequest.sectionName}
        itemName={auditRequest.itemName}
        itemType={auditRequest.itemType}
        onSuccess={handleAuditSuccess}
      />
    </div>
  );
}
