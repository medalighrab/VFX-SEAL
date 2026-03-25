import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ContactModal from "../components/ContactModal";
import PublicNavbar from "../components/PublicNavbar";
import {
  VendorGridSkeleton,
  VendorFilterSkeleton,
} from "../components/VendorSkeleton";
import { useVendors } from "../hooks/useVendors";
import {
  FiChevronLeft,
  FiChevronRight,
  FiHeart,
  FiMapPin,
  FiSearch,
  FiStar,
} from "react-icons/fi";
import { FaHeart } from "react-icons/fa";
import badgeGold from "../assets/BADGE_VOE/Badges_01_VOE_transp.png";
import badgeSilver from "../assets/BADGE_VOE/Badges_02_VOE_transp.png";
import badgeCandidate from "../assets/BADGE_VOE/Badges_05_VOE_transp.png";
const BADGE_IMAGES = {
  Gold: badgeGold,
  Silver: badgeSilver,
  Candidate: badgeCandidate,
};

const PAGE_SIZE = 20;

export default function VendorsPage() {
  const navigate = useNavigate();
  const { isAdmin, isLoggedIn } = useAuth();
  const [contactOpen, setContactOpen] = useState(false);
  const featuredRowRef = useRef(null);
  const {
    vendors,
    favoriteVendorIds,
    favoriteActionLoadingIds,
    feedbackSummaries,
    filters,
    loading,
    error,
    searchTerm,
    activeFilters,
    pagination,
    updateSearch,
    updateFilters,
    changePage,
    toggleFavorite,
  } = useVendors();

  const handleSearchChange = (e) => {
    updateSearch(e.target.value);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    // Search is automatically triggered by debounced input
  };

  const toggleFilter = (type, value) => {
    const newFilters = { ...activeFilters };
    const arr = newFilters[type];
    const updated = arr.includes(value)
      ? arr.filter((v) => v !== value)
      : [...arr, value];
    newFilters[type] = updated;
    updateFilters(newFilters);
  };

  const clearFilters = () => {
    updateFilters({ country: [], size: [], badge: [], favoriteOnly: false });
    updateSearch("");
  };

  const handleFavoriteClick = async (event, vendorId) => {
    event.stopPropagation();

    if (favoriteActionLoadingIds.includes(vendorId)) return;

    try {
      await toggleFavorite(vendorId);
    } catch (error) {
      alert(error.displayMessage || "Failed to update favorites");
    }
  };

  const isFavoriteVendor = (vendorId) =>
    favoriteVendorIds.includes(vendorId) ||
    (activeFilters.favoriteOnly &&
      vendors.some((vendor) => vendor._id === vendorId));

  const validationTierOptions = [
    { key: "self", label: "Self-assessed", badges: ["Candidate"] },
    { key: "non", label: "The rest", badges: ["None"] },
  ];

  const badgeFilterOptions = [
    { key: "gold", label: "Gold", badge: "Gold" },
    { key: "silver", label: "Silver", badge: "Silver" },
    { key: "candidate", label: "Candidate", badge: "Candidate" },
  ];

  const isTierActive = (tierOption) =>
    tierOption.badges.every((badge) => activeFilters.badge.includes(badge));

  const toggleValidationTier = (tierOption) => {
    const isActive = isTierActive(tierOption);
    const currentBadges = new Set(activeFilters.badge);

    if (isActive) {
      tierOption.badges.forEach((badge) => currentBadges.delete(badge));
    } else {
      tierOption.badges.forEach((badge) => currentBadges.add(badge));
    }

    updateFilters({
      ...activeFilters,
      badge: Array.from(currentBadges),
    });
  };

  const scrollFeaturedRow = (direction) => {
    if (!featuredRowRef.current) return;
    const scrollAmount = 360 * direction;
    featuredRowRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  const openVendorDetail = (vendor) => {
    if (!vendor?.slug) return;

    try {
      const cacheKey = "vendor_snapshot_cache";
      const existing = JSON.parse(sessionStorage.getItem(cacheKey) || "{}");
      existing[vendor.slug] = {
        ...vendor,
        _cachedAt: Date.now(),
      };
      sessionStorage.setItem(cacheKey, JSON.stringify(existing));
    } catch (e) {
      // Ignore cache errors and proceed with navigation.
    }

    navigate(`/vendors/${vendor.slug}`, {
      state: { vendorSnapshot: vendor },
    });
  };

  const normalizeBadgeType = (badge) => {
    const raw = String(badge || "")
      .trim()
      .toLowerCase();
    if (raw === "gold") return "Gold";
    if (raw === "silver") return "Silver";
    if (raw === "candidate") return "Candidate";
    return "None";
  };

  const badgeClass = (badge) => {
    const normalized = normalizeBadgeType(badge);
    if (normalized === "Candidate") return "none";
    return normalized.toLowerCase();
  };

  const renderBadgeVisual = (badgeType) => {
    const src = BADGE_IMAGES[badgeType];
    if (!src) return "—";
    return (
      <img
        src={src}
        alt={`${badgeType} badge`}
        className={`badge-icon ${badgeType.toLowerCase()}`}
        loading="lazy"
        decoding="async"
        style={{ width: "1em", height: "1em", objectFit: "contain" }}
      />
    );
  };

  const getBadgeType = (vendor) => {
    if (!vendor) return "None";
    return normalizeBadgeType(vendor.badgeVOE);
  };

  const isVOEAuditedBadge = (badgeType) => {
    const normalized = normalizeBadgeType(badgeType);
    return normalized === "Gold" || normalized === "Silver";
  };

  const isSponsoredVendor = (vendor) => {
    return Boolean(vendor?.isSponsored || vendor?.sponsored || vendor?.boosted);
  };

  const getValidationTier = (badgeType) => {
    const normalized = normalizeBadgeType(badgeType);
    if (normalized === "Gold" || normalized === "Silver") {
      return "VOE-audited";
    }
    if (normalized === "Candidate") {
      return "Self-assessed";
    }
    return "Non-audited";
  };

  const getBadgeDisplayLabel = (badgeType) => {
    const normalized = normalizeBadgeType(badgeType);
    if (normalized === "None") return "Non-audited";
    return normalized;
  };

  const getTierClass = (badgeType) => {
    const normalized = normalizeBadgeType(badgeType);
    if (normalized === "Gold" || normalized === "Silver") return "tier-audited";
    if (normalized === "Candidate") return "tier-self-assessed";
    return "tier-non-audited";
  };

  const renderStars = (rating) => {
    return (
      <div className="stars stars-sm">
        {[1, 2, 3, 4, 5].map((star) => (
          <FiStar
            key={star}
            className={`star ${star <= Math.round(rating) ? "filled" : ""}`}
            size={16}
          />
        ))}
      </div>
    );
  };

  // Generate a gradient background based on vendor badge
  const getCardGradient = (badge) => {
    switch (badge) {
      case "Gold":
        return "linear-gradient(135deg, rgba(201,163,79,0.15) 0%, rgba(201,163,79,0.03) 50%, transparent 100%)";
      case "Silver":
        return "linear-gradient(135deg, rgba(192,192,192,0.12) 0%, rgba(192,192,192,0.03) 50%, transparent 100%)";
      case "Bronze":
        return "linear-gradient(135deg, rgba(205,127,50,0.12) 0%, rgba(205,127,50,0.03) 50%, transparent 100%)";
      case "Blue":
        return "linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.03) 50%, transparent 100%)";
      default:
        return "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 100%)";
    }
  };

  const handleVendorImageError = (e) => {
    const img = e.currentTarget;
    img.style.display = "none";
    const fallback = img.nextElementSibling;
    if (fallback) {
      fallback.style.display = "flex";
    }
  };

  const currentPage = pagination.page || 1;
  const totalPages = pagination.totalPages || 1;
  const totalVendors = pagination.total || 0;
  const pageStart = totalVendors === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * PAGE_SIZE, totalVendors);

  const highlightedVendors = [...vendors]
    .sort((a, b) => {
      const aSponsored = isSponsoredVendor(a) ? 1 : 0;
      const bSponsored = isSponsoredVendor(b) ? 1 : 0;
      if (aSponsored !== bSponsored) return bSponsored - aSponsored;

      const aAudited = isVOEAuditedBadge(getBadgeType(a)) ? 1 : 0;
      const bAudited = isVOEAuditedBadge(getBadgeType(b)) ? 1 : 0;
      if (aAudited !== bAudited) return bAudited - aAudited;

      const aScore = Number(a.globalScore) || 0;
      const bScore = Number(b.globalScore) || 0;
      return bScore - aScore;
    })
    .slice(0, 8);

  const getVisiblePages = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = [1];
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    if (start > 2) pages.push("...");
    for (let p = start; p <= end; p += 1) pages.push(p);
    if (end < totalPages - 1) pages.push("...");

    pages.push(totalPages);
    return pages;
  };

  return (
    <div
      className="vendors-page"
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      {/* Public Navbar for non-logged-in users */}
      {!isLoggedIn && <PublicNavbar />}

      <div className="page-wrapper" style={{ flex: 1 }}>
        <div className="container">
          <div className="vendors-header slide-up">
            <div className="vendors-header-top">
              <div>
                <h1>The Seal Marketplace</h1>
                <p>
                  Compare vendors with transparent validation layers:
                  VOE-audited, self-assessed, and non-audited profiles.
                </p>
              </div>
              {!isAdmin && (
                <button
                  className="btn btn-primary"
                  onClick={() => setContactOpen(true)}
                  id="contact-btn"
                >
                  Contact Us
                </button>
              )}
            </div>
          </div>

          <div className="vendors-layout">
            {/* Filter Sidebar */}
            <aside className="filter-sidebar fade-in">
              {loading && filters.countries.length === 0 ? (
                <VendorFilterSkeleton />
              ) : (
                <>
                  <div className="filter-title">
                    Filters
                    {(activeFilters.country.length > 0 ||
                      activeFilters.badge.length > 0) && (
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={clearFilters}
                        style={{ marginLeft: "auto", fontSize: "0.7rem" }}
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <form
                    onSubmit={handleSearchSubmit}
                    style={{ marginBottom: "var(--space-lg)" }}
                  >
                    <div className="search-bar">
                      <span className="search-icon" aria-hidden="true">
                        <FiSearch size={16} />
                      </span>
                      <input
                        className="form-input"
                        placeholder="Search vendors..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        id="vendor-search"
                      />
                    </div>
                  </form>

                  <div className="filter-group">
                    <div className="filter-group-title">My Vendors</div>
                    <div
                      className={`filter-option ${activeFilters.favoriteOnly ? "active" : ""}`}
                      onClick={() =>
                        updateFilters({
                          ...activeFilters,
                          favoriteOnly: !activeFilters.favoriteOnly,
                        })
                      }
                    >
                      <span className="filter-checkbox" />
                      My List
                    </div>
                  </div>

                  {filters.countries && filters.countries.length > 0 && (
                    <div className="filter-group">
                      <div className="filter-group-title">Country</div>
                      {filters.countries.sort().map((c) => (
                        <div
                          key={c}
                          className={`filter-option ${activeFilters.country.includes(c) ? "active" : ""}`}
                          onClick={() => toggleFilter("country", c)}
                        >
                          <span className="filter-checkbox" />
                          {c}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="filter-group">
                    <div className="filter-group-title">Validation Profile</div>
                    {validationTierOptions.map((tier) => (
                      <div
                        key={tier.key}
                        className={`filter-option ${isTierActive(tier) ? "active" : ""}`}
                        onClick={() => toggleValidationTier(tier)}
                      >
                        <span className="filter-checkbox" />
                        {tier.label}
                      </div>
                    ))}

                    <div
                      className="filter-group-title"
                      style={{ marginTop: "var(--space-md)" }}
                    >
                      Badge
                    </div>
                    {badgeFilterOptions.map((badgeOption) => (
                      <div
                        key={badgeOption.key}
                        className={`filter-option ${activeFilters.badge.includes(badgeOption.badge) ? "active" : ""}`}
                        onClick={() => toggleFilter("badge", badgeOption.badge)}
                      >
                        <span className="filter-checkbox" />
                        {badgeOption.label}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </aside>

            {/* Vendor List — Netflix Style */}
            <main>
              {loading ? (
                <VendorGridSkeleton count={9} />
              ) : error ? (
                <div className="alert alert-error">{error}</div>
              ) : vendors.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <FiSearch size={48} />
                  </div>
                  {activeFilters.favoriteOnly ? (
                    <>
                      <h3>No saved vendors yet</h3>
                      <p>
                        Save vendors with the heart icon, then enable My List to
                        find them quickly.
                      </p>
                    </>
                  ) : (
                    <>
                      <h3>No vendors found</h3>
                      <p>Try adjusting your search or filters.</p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  {highlightedVendors.length > 0 && (
                    <section className="marketplace-featured-band fade-in">
                      <div className="marketplace-featured-header">
                        <h2>
                          <FiStar size={16} style={{ marginRight: 8 }} />
                          VOE audited Vendors
                        </h2>
                        <p>
                          VOE-audited vendors are prioritized here as reference
                          profiles. Sponsored placements ("Support The Seal")
                          can also appear in this band.
                        </p>
                      </div>

                      <div className="marketplace-featured-row">
                        {highlightedVendors.map((vendor) => {
                          const summary = feedbackSummaries[vendor._id] || {
                            avgRating: 0,
                            totalRatings: 0,
                          };
                          const badgeType = getBadgeType(vendor);
                          const tierLabel = getValidationTier(badgeType);
                          const sponsored = isSponsoredVendor(vendor);
                          const isFavorite = isFavoriteVendor(vendor._id);
                          const isPending = favoriteActionLoadingIds.includes(
                            vendor._id,
                          );
                          return (
                            <div
                              className={`netflix-card marketplace-card is-featured ${isVOEAuditedBadge(badgeType) ? "is-audited" : "is-regular"}`}
                              key={`featured-${vendor._id}`}
                              onClick={() => openVendorDetail(vendor)}
                              style={{ background: getCardGradient(badgeType) }}
                            >
                              <div className="netflix-card-hero">
                                {vendor.logo ? (
                                  <>
                                    <img
                                      src={vendor.logo}
                                      alt={vendor.name}
                                      className="netflix-card-img"
                                      loading="lazy"
                                      decoding="async"
                                      onError={handleVendorImageError}
                                    />
                                    <div
                                      className="netflix-card-placeholder"
                                      style={{ display: "none" }}
                                    >
                                      <span>{vendor.name.charAt(0)}</span>
                                    </div>
                                  </>
                                ) : (
                                  <div className="netflix-card-placeholder">
                                    <span>{vendor.name.charAt(0)}</span>
                                  </div>
                                )}
                                <div className="netflix-card-overlay">
                                  <div className="vendor-card-actions">
                                    <button
                                      type="button"
                                      className={`favorite-action ${isFavorite ? "active" : ""} ${isPending ? "is-loading" : ""}`}
                                      aria-label={
                                        isFavorite
                                          ? "Remove from my list"
                                          : "Save to my list"
                                      }
                                      disabled={isPending}
                                      onClick={(event) =>
                                        handleFavoriteClick(event, vendor._id)
                                      }
                                    >
                                      {isFavorite ? (
                                        <FaHeart size={14} />
                                      ) : (
                                        <FiHeart size={14} />
                                      )}
                                    </button>
                                  </div>
                                  <span
                                    className={`voe-badge ${badgeClass(badgeType)}`}
                                  >
                                    <span className="voe-badge-icon">
                                      {renderBadgeVisual(badgeType)}
                                    </span>
                                    {getBadgeDisplayLabel(badgeType)}
                                  </span>
                                  {sponsored && (
                                    <span className="vendor-sponsored-tag">
                                      Sponsored
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="netflix-card-body">
                                <h3 className="netflix-card-name">
                                  {vendor.name}
                                </h3>
                                <div className="netflix-card-meta">
                                  <span>
                                    <FiMapPin size={14} /> {vendor.country}
                                  </span>
                                  <span className="vendor-meta-dot" />
                                  <span>{vendor.size}</span>
                                </div>

                                <span
                                  className={`vendor-verification-tier ${getTierClass(badgeType)}`}
                                >
                                  {tierLabel}
                                </span>

                                <div className="netflix-card-footer">
                                  <div className="netflix-card-score">
                                    <div className="netflix-score-ring">
                                      <span className="netflix-score-val">
                                        {vendor.globalScore?.toFixed(1)}
                                      </span>
                                    </div>
                                    <span className="netflix-score-label">
                                      Trust
                                    </span>
                                  </div>
                                  <div className="netflix-card-rating">
                                    {summary.totalRatings > 0 ? (
                                      <>
                                        {renderStars(summary.avgRating)}
                                        <span className="netflix-rating-info">
                                          {summary.avgRating.toFixed(1)} (
                                          {summary.totalRatings})
                                        </span>
                                      </>
                                    ) : (
                                      <span className="netflix-no-reviews">
                                        No reviews yet
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  <div className="marketplace-list-header">
                    <h2>Full Marketplace</h2>
                    <p>
                      All vendors are listed below with clear verification
                      levels: VOE-audited, self-assessed, and non-audited.
                    </p>
                  </div>

                  <div className="vendors-count">
                    {pagination.total} vendor{pagination.total !== 1 ? "s" : ""}{" "}
                    found
                  </div>

                  <div className="netflix-grid">
                    {vendors.map((vendor) => {
                      const summary = feedbackSummaries[vendor._id] || {
                        avgRating: 0,
                        totalRatings: 0,
                      };
                      const badgeType = getBadgeType(vendor);
                      const tierLabel = getValidationTier(badgeType);
                      const sponsored = isSponsoredVendor(vendor);
                      const isFavorite = isFavoriteVendor(vendor._id);
                      const isPending = favoriteActionLoadingIds.includes(
                        vendor._id,
                      );
                      return (
                        <div
                          className={`netflix-card marketplace-card slide-up ${isVOEAuditedBadge(badgeType) ? "is-audited" : "is-regular"}`}
                          key={vendor._id}
                          onClick={() => openVendorDetail(vendor)}
                          id={`vendor-${vendor.slug}`}
                          style={{
                            background: getCardGradient(badgeType),
                          }}
                        >
                          {/* Hero Image / Logo */}
                          <div className="netflix-card-hero">
                            {vendor.logo ? (
                              <>
                                <img
                                  src={vendor.logo}
                                  alt={vendor.name}
                                  className="netflix-card-img"
                                  loading="lazy"
                                  decoding="async"
                                  onError={handleVendorImageError}
                                />
                                <div
                                  className="netflix-card-placeholder"
                                  style={{ display: "none" }}
                                >
                                  <span>{vendor.name.charAt(0)}</span>
                                </div>
                              </>
                            ) : (
                              <div className="netflix-card-placeholder">
                                <span>{vendor.name.charAt(0)}</span>
                              </div>
                            )}
                            <div className="netflix-card-overlay">
                              <div className="vendor-card-actions">
                                <button
                                  type="button"
                                  className={`favorite-action ${isFavorite ? "active" : ""} ${isPending ? "is-loading" : ""}`}
                                  aria-label={
                                    isFavorite
                                      ? "Remove from my list"
                                      : "Save to my list"
                                  }
                                  disabled={isPending}
                                  onClick={(event) =>
                                    handleFavoriteClick(event, vendor._id)
                                  }
                                >
                                  {isFavorite ? (
                                    <FaHeart size={14} />
                                  ) : (
                                    <FiHeart size={14} />
                                  )}
                                </button>
                              </div>
                              <span
                                className={`voe-badge ${badgeClass(badgeType)}`}
                              >
                                <span className="voe-badge-icon">
                                  {renderBadgeVisual(badgeType)}
                                </span>
                                {getBadgeDisplayLabel(badgeType)}
                              </span>
                              {sponsored && (
                                <span className="vendor-sponsored-tag">
                                  Sponsored
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Content */}
                          <div className="netflix-card-body">
                            <h3 className="netflix-card-name">{vendor.name}</h3>
                            <div className="netflix-card-meta">
                              <span>
                                <FiMapPin size={14} /> {vendor.country}
                              </span>
                              <span className="vendor-meta-dot" />
                              <span>{vendor.size}</span>
                            </div>

                            {vendor.shortDescription && (
                              <p className="netflix-card-desc">
                                {vendor.shortDescription}
                              </p>
                            )}

                            <span
                              className={`vendor-verification-tier ${getTierClass(badgeType)}`}
                            >
                              {tierLabel}
                            </span>

                            {vendor.services?.length > 0 && (
                              <div className="netflix-card-services">
                                {vendor.services.slice(0, 3).map((s) => (
                                  <span className="service-tag" key={s}>
                                    {s}
                                  </span>
                                ))}
                                {vendor.services.length > 3 && (
                                  <span
                                    className="service-tag"
                                    style={{ opacity: 0.6 }}
                                  >
                                    +{vendor.services.length - 3}
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="netflix-card-footer">
                              <div className="netflix-card-score">
                                <div className="netflix-score-ring">
                                  <span className="netflix-score-val">
                                    {vendor.globalScore?.toFixed(1)}
                                  </span>
                                </div>
                                <span className="netflix-score-label">
                                  Trust
                                </span>
                              </div>
                              <div className="netflix-card-rating">
                                {summary.totalRatings > 0 ? (
                                  <>
                                    {renderStars(summary.avgRating)}
                                    <span className="netflix-rating-info">
                                      {summary.avgRating.toFixed(1)} (
                                      {summary.totalRatings})
                                    </span>
                                  </>
                                ) : (
                                  <span className="netflix-no-reviews">
                                    No reviews yet
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {totalPages > 1 && (
                    <div
                      style={{
                        marginTop: "var(--space-xl)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "var(--space-md)",
                      }}
                    >
                      <div className="vendors-count">
                        Showing {pageStart}-{pageEnd} of {totalVendors}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--space-sm)",
                          flexWrap: "wrap",
                          justifyContent: "center",
                        }}
                      >
                        <button
                          className="btn btn-secondary"
                          onClick={() => changePage(currentPage - 1)}
                          disabled={currentPage <= 1 || loading}
                        >
                          Previous
                        </button>

                        {getVisiblePages().map((pageNum, idx) =>
                          pageNum === "..." ? (
                            <span
                              key={`ellipsis-${idx}`}
                              style={{ color: "var(--text-muted)" }}
                            >
                              ...
                            </span>
                          ) : (
                            <button
                              key={pageNum}
                              className={
                                pageNum === currentPage
                                  ? "btn btn-primary"
                                  : "btn btn-secondary"
                              }
                              onClick={() => changePage(pageNum)}
                              disabled={loading}
                            >
                              {pageNum}
                            </button>
                          ),
                        )}

                        <button
                          className="btn btn-secondary"
                          onClick={() => changePage(currentPage + 1)}
                          disabled={currentPage >= totalPages || loading}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </main>
          </div>
        </div>

        <ContactModal
          isOpen={contactOpen}
          onClose={() => setContactOpen(false)}
        />
      </div>
      {/* Footer */}
      <footer className="home-footer">
        <div className="container">
          <div className="footer-inner">
            <div className="footer-brand">
              VFX <span className="accent">Seal</span>
            </div>
            <div className="footer-links">
              <Link to="/">Home</Link>
              <Link to="/contact">Contact</Link>
              {!isLoggedIn && <Link to="/login">Login</Link>}
            </div>
            <div className="footer-copy">
              <div className="footer-copyright">
                © The Seal — All rights reserved
              </div>
              <div className="footer-legal">
                <Link to="/terms" className="footer-legal-link">
                  Terms & Conditions
                </Link>
                <span className="footer-separator">•</span>
                <Link to="/privacy-policy" className="footer-legal-link">
                  Privacy Policy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
