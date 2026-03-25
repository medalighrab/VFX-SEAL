import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FiChevronLeft,
  FiChevronRight,
  FiMapPin,
  FiUsers,
} from "react-icons/fi";
import badgeGold from "../assets/BADGE_VOE/Badges_01_VOE_transp.png";
import badgeSilver from "../assets/BADGE_VOE/Badges_02_VOE_transp.png";
import badgeCandidate from "../assets/BADGE_VOE/Badges_05_VOE_transp.png";

const BADGE_IMAGES = {
  Gold: badgeGold,
  Silver: badgeSilver,
  Candidate: badgeCandidate,
};

export default function VendorCarousel({ title, vendors, category }) {
  const scrollRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const scroll = (direction) => {
    const container = scrollRef.current;
    if (!container) return;

    const scrollAmount = 320; // Width of one card + gap
    const newScrollLeft =
      direction === "left"
        ? container.scrollLeft - scrollAmount
        : container.scrollLeft + scrollAmount;

    container.scrollTo({
      left: newScrollLeft,
      behavior: "smooth",
    });
  };

  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    const container = scrollRef.current;
    if (container) {
      handleScroll(); // Initial check
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [vendors]);

  const normalizeBadgeType = (badge) => {
    const raw = String(badge || "")
      .trim()
      .toLowerCase();
    if (raw === "gold") return "Gold";
    if (raw === "silver") return "Silver";
    if (raw === "candidate") return "Candidate";
    return "None";
  };

  const getBadgeType = (vendor) => {
    return normalizeBadgeType(vendor?.badgeVOE);
  };

  const getBadgeStyleClass = (badgeType) => {
    if (badgeType === "Candidate") return "none";
    return badgeType.toLowerCase();
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

  const getTeamSizeNumber = (size) => {
    const sizeMap = {
      Micro: "1-10",
      Small: "11-50",
      Medium: "51-200",
      Large: "200+",
    };
    return sizeMap[size] || size;
  };

  const handleVendorImageError = (e) => {
    const img = e.currentTarget;
    img.style.display = "none";
    const fallback = img.nextElementSibling;
    if (fallback) {
      fallback.style.display = "flex";
    }
  };

  const getSampleName = (index) => {
    const categoryLabelMap = {
      topRated: "Featured",
      veterans: "Established",
      bigTeam: "Large Team",
      newStudios: "Emerging",
    };
    const label = categoryLabelMap[category] || "Sample";
    return `John Doe Studio ${label} ${index + 1}`;
  };

  if (!vendors || vendors.length === 0) {
    return null;
  }

  return (
    <div className="vendor-carousel-section">
      <div className="carousel-header">
        <h3 className="carousel-title">{title}</h3>
        <div className="carousel-navigation">
          <button
            className={`carousel-nav-btn ${!showLeftArrow ? "disabled" : ""}`}
            onClick={() => scroll("left")}
            disabled={!showLeftArrow}
          >
            <FiChevronLeft size={20} />
          </button>
          <button
            className={`carousel-nav-btn ${!showRightArrow ? "disabled" : ""}`}
            onClick={() => scroll("right")}
            disabled={!showRightArrow}
          >
            <FiChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="carousel-container">
        <div className="carousel-track" ref={scrollRef} onScroll={handleScroll}>
          {vendors.map((vendor, index) => {
            const badgeType = getBadgeType(vendor);
            const sampleName = getSampleName(index);

            return (
              <Link
                to="/vendors"
                key={vendor._id}
                className="carousel-vendor-card"
              >
                <div className="carousel-card-inner">
                  {/* Studio Logo/Avatar */}
                  <div className="carousel-vendor-logo">
                    <span className="logo-placeholder">
                      {sampleName.charAt(0)}
                    </span>
                  </div>

                  {/* Studio Info */}
                  <div className="carousel-vendor-info">
                    <span className="carousel-preview-chip">
                      Sample / Non-contractual preview
                    </span>
                    <h4 className="carousel-vendor-name">{sampleName}</h4>
                    <div className="carousel-vendor-meta">
                      <span className="carousel-location">
                        <FiMapPin size={14} /> Sample Location
                      </span>
                      <span className="carousel-team-size">
                        <FiUsers size={14} /> Team size hidden
                      </span>
                    </div>

                    {/* Stars-only preview (no numeric score for launch preview) */}
                    <div className="carousel-score-container">
                      <div className="carousel-score-badge gold preview-stars-badge">
                        <span className="star-rating-preview">★★★★★</span>
                      </div>
                      <div
                        className={`carousel-badge ${getBadgeStyleClass(badgeType)}`}
                      >
                        <span className="badge-icon-wrapper">
                          {renderBadgeVisual(badgeType)}
                        </span>
                        <span className="badge-text">{badgeType}</span>
                      </div>
                    </div>

                    {/* Services Preview */}
                    {vendor.services && vendor.services.length > 0 && (
                      <div className="carousel-services">
                        {vendor.services.slice(0, 3).map((service, idx) => (
                          <span key={idx} className="carousel-service-tag">
                            {service}
                          </span>
                        ))}
                        {vendor.services.length > 3 && (
                          <span className="carousel-service-more">
                            +{vendor.services.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
