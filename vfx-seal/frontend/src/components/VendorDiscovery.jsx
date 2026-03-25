import { useState, useEffect } from "react";
import VendorCarousel from "./VendorCarousel";
import api from "../api/client";

/**
 * Parse a team-size string like "51-200", "200+", "1000+" into a sortable number.
 * Returns the upper bound of ranges, or the number before "+".
 */
function parseTeamSize(str) {
  if (!str) return 0;
  const s = String(str);
  const plusMatch = s.match(/(\d+)\+/);
  if (plusMatch) return parseInt(plusMatch[1], 10);
  const rangeMatch = s.match(/\d+-(\d+)/);
  if (rangeMatch) return parseInt(rangeMatch[1], 10);
  const numMatch = s.match(/\d+/);
  return numMatch ? parseInt(numMatch[0], 10) : 0;
}

export default function VendorDiscovery() {
  const [vendorCategories, setVendorCategories] = useState({
    topRated: [],
    veterans: [],
    bigTeam: [],
    newStudios: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchCategorizedVendors = async () => {
      try {
        const response = await api.get("/odoo/vendors?limit=100");
        const vendors = response.data.vendors || [];

        if (vendors.length === 0) {
          setVendorCategories((prev) => ({ ...prev, loading: false }));
          return;
        }

        const currentYear = new Date().getFullYear();

        // Categorize vendors
        const categorized = {
          // Top Rated: Sort by score descending, take top 12
          topRated: [...vendors]
            .sort((a, b) => (b.globalScore || 0) - (a.globalScore || 0))
            .slice(0, 12),

          // Veterans: Oldest founded studios first
          veterans: vendors
            .filter((v) => v.foundedYear)
            .sort((a, b) => a.foundedYear - b.foundedYear)
            .slice(0, 12),

          // Big Teams: Sort by parsed teamSize descending
          bigTeam: [...vendors]
            .sort(
              (a, b) =>
                parseTeamSize(b.teamSize || b.size) -
                parseTeamSize(a.teamSize || a.size),
            )
            .slice(0, 12),

          // New Studios: Founded in last 2-3 years
          newStudios: vendors
            .filter((v) => v.foundedYear && currentYear - v.foundedYear <= 3)
            .sort((a, b) => b.foundedYear - a.foundedYear)
            .slice(0, 12),

          loading: false,
          error: null,
        };

        setVendorCategories(categorized);
      } catch (error) {
        console.error("Error fetching vendor categories:", error);
        setVendorCategories((prev) => ({
          ...prev,
          loading: false,
          error: error.message || "Failed to load vendor categories",
        }));
      }
    };

    fetchCategorizedVendors();
  }, []);

  if (vendorCategories.loading) {
    return (
      <section className="vendor-discovery-section">
        <div className="container">
          <div className="discovery-header">
            <span className="section-tag">Discovery</span>
            <h2 className="section-title">Explore VFX Studios</h2>
            <p className="section-subtitle">
              Discover certified vendors across different categories and regions
            </p>
          </div>
          <div className="carousel-loading">
            <div className="loading-carousel-skeleton">
              <div className="loading-carousel-title"></div>
              <div className="loading-carousel-track">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="loading-carousel-card"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (vendorCategories.error) {
    return (
      <section className="vendor-discovery-section">
        <div className="container">
          <div className="discovery-error">
            <p>Unable to load vendor categories. Please try again later.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="vendor-discovery-section">
      <div className="container">
        <div className="discovery-header">
          <span className="section-tag">Discovery</span>
          <h2 className="section-title">Explore VFX Studios</h2>
          <p className="section-subtitle">
            Discover certified vendors across different categories and regions
          </p>
        </div>

        <div className="discovery-carousels">
          {/* Top Rated Studios */}
          {vendorCategories.topRated.length > 0 && (
            <VendorCarousel
              title="Top Rated Studios"
              vendors={vendorCategories.topRated}
              category="topRated"
            />
          )}

          {/* Veteran Studios */}
          {vendorCategories.veterans.length > 0 && (
            <VendorCarousel
              title="Industry Veterans"
              vendors={vendorCategories.veterans}
              category="veterans"
            />
          )}

          {/* Large Teams */}
          {vendorCategories.bigTeam.length > 0 && (
            <VendorCarousel
              title="Large Team Studios"
              vendors={vendorCategories.bigTeam}
              category="bigTeam"
            />
          )}

          {/* New Studios */}
          {vendorCategories.newStudios.length > 0 && (
            <VendorCarousel
              title="Emerging Studios"
              vendors={vendorCategories.newStudios}
              category="newStudios"
            />
          )}
        </div>
      </div>
    </section>
  );
}
