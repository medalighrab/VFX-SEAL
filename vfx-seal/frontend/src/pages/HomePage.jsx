import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PublicNavbar from "../components/PublicNavbar";
import VendorDiscovery from "../components/VendorDiscovery";
import sealLogo from "../assets/seal.png";
import registerstep from "../assets/register-step.avif";
import verificationstep from "../assets/verification-step.jfif";
import AssessorsSection from "../components/AssessorsSection";
import aboutImage from "../assets/about-image.webp";
import voeLogo from "../assets/BADGE_VOE/Web_Logo_Audit_B_transp.png";

const explorstep =
  "https://images.unsplash.com/photo-1487014679447-9f8336841d58?auto=format&fit=crop&w=1200&q=80";
const feedbackstep =
  "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80";

export default function HomePage() {
  const { isLoggedIn, isAdmin, isApproved } = useAuth();

  const getStartedLink = isLoggedIn
    ? isAdmin
      ? "/admin"
      : isApproved
        ? "/vendors"
        : "/pending"
    : "/register";

  return (
    <div className="home-page">
      {/* Public Navbar for non-logged-in users */}
      {!isLoggedIn && <PublicNavbar />}

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-particles">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="particle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`,
              }}
            />
          ))}
        </div>
        <div className="hero-glow-frame">
          <div className="hero-glow" />
          <div className="hero-frame-layout">
            <div className="hero-content">
              <h1 className="hero-title">
                The <span className="hero-accent">Selective Marketplace</span>
                <br />
                for VFX Vendor Discovery.
              </h1>
              <p className="hero-subtitle">
                The Seal gives VFX professionals free access to search, compare,
                and evaluate vendor profiles with full transparency on what is
                VOE-audited, self-declared, or not audited.
              </p>
              <div className="hero-cta">
                <Link
                  to={getStartedLink}
                  className="btn btn-primary btn-xl hero-btn"
                >
                  <span className="hero-btn-glow" />
                  {isLoggedIn ? "Go to Dashboard" : "Join the Club"}
                </Link>
              </div>
            </div>

            <div className="hero-visual">
              <div className="seal-logo-container">
                <img
                  src={sealLogo}
                  alt="VFX Seal Certification"
                  className="seal-logo"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Process</span>
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">
              From access to comparison - your marketplace workflow for VFX
              partner research
            </p>
          </div>
          <div className="how-grid-enhanced">
            <div className="how-card-enhanced">
              <div className="how-card-number">01</div>
              <div className="how-card-image">
                <img
                  src={registerstep}
                  alt="Developer coding screen"
                  className="step-image"
                />
              </div>
              <h3>Register</h3>
              <p>
                Sign up using your official company email, specifying your role
                and region.
              </p>
            </div>
            <div className="how-card-enhanced">
              <div className="how-card-number">02</div>
              <div className="how-card-image">
                <img
                  src={verificationstep}
                  alt="Team review and validation"
                  className="step-image"
                />
              </div>
              <h3>Verification</h3>
              <p>
                Our team manually reviews and verifies each profile to ensure
                exclusivity and security.
              </p>
            </div>
            <div className="how-card-enhanced">
              <div className="how-card-number">03</div>
              <div className="how-card-image">
                <img
                  src={explorstep}
                  alt="Secure browsing and exploration interface"
                  className="step-image"
                />
              </div>
              <h3>Explore </h3>
              <p>
                Once approved, you can freely browse the VFX marketplace. Your
                research and activity remain strictly confidential.
              </p>
            </div>
            <div className="how-card-enhanced">
              <div className="how-card-number">04</div>
              <div className="how-card-image">
                <img
                  src={feedbackstep}
                  alt="Community communication and feedback exchange"
                  className="step-image"
                />
              </div>
              <h3>Reach & 360° Feedback</h3>
              <p>
                Reach out to vendors directly, outside the platform – no
                intermediaries, no commissions – and contribute to the feedback
                community.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Vendor Discovery Section - Netflix-style for logged in users */}
      {isLoggedIn && isApproved ? (
        <VendorDiscovery />
      ) : (
        /* Locked Preview Section for non-logged-in users */
        <section className="vendor-showcase-section">
          <div className="container">
            <div className="showcase-header">
              <span className="section-tag">Exclusive Preview</span>
              <h2 className="section-title">
                Preview Our Certified Vendor Network
              </h2>
              <p className="section-subtitle">
                Get a glimpse of the industry's most trusted VFX partners
              </p>
            </div>

            <div className="vendor-showcase-grid">
              <div className="showcase-vendor-card locked-preview">
                <div className="vendor-showcase-header">
                  <div className="vendor-showcase-logo">JD</div>
                  <div className="vendor-showcase-info">
                    <h3 className="masked-vendor-name">John Doe Studio A</h3>
                    <span className="vendor-location">Sample City, Region</span>
                  </div>
                  <div className="voe-score-badge gold preview-stars-badge">
                    <span className="star-rating-preview">★★★★★</span>
                  </div>
                </div>
                <div className="vendor-showcase-services">
                  <span className="service-tag">VFX Supervision</span>
                  <span className="service-tag">Compositing</span>
                  <span className="service-tag blurred">3D Animation</span>
                </div>
                <div className="vendor-locked-details">
                  <div className="locked-content">
                    <div className="locked-item">Portfolio Details</div>
                    <div className="locked-item">Contact Information</div>
                    <div className="locked-item">Pricing Structure</div>
                  </div>
                </div>
              </div>

              <div className="showcase-vendor-card locked-preview">
                <div className="vendor-showcase-header">
                  <div className="vendor-showcase-logo">NP</div>
                  <div className="vendor-showcase-info">
                    <h3 className="masked-vendor-name">John Doe Studio B</h3>
                    <span className="vendor-location">Sample City, Region</span>
                  </div>
                  <div className="voe-score-badge gold preview-stars-badge">
                    <span className="star-rating-preview">★★★★★</span>
                  </div>
                </div>
                <div className="vendor-showcase-services">
                  <span className="service-tag">Environment VFX</span>
                  <span className="service-tag blurred">Creature Work</span>
                  <span className="service-tag blurred">Matte Painting</span>
                </div>
                <div className="vendor-locked-details">
                  <div className="locked-content">
                    <div className="locked-item">Recent Projects</div>
                    <div className="locked-item">Team Capacity</div>
                    <div className="locked-item">Availability Status</div>
                  </div>
                </div>
              </div>

              <div className="showcase-vendor-card locked-preview">
                <div className="vendor-showcase-header">
                  <div className="vendor-showcase-logo">AL</div>
                  <div className="vendor-showcase-info">
                    <h3 className="masked-vendor-name">John Doe Studio C</h3>
                    <span className="vendor-location">Sample City, Region</span>
                  </div>
                  <div className="voe-score-badge gold preview-stars-badge">
                    <span className="star-rating-preview">★★★★★</span>
                  </div>
                </div>
                <div className="vendor-showcase-services">
                  <span className="service-tag">Motion Capture</span>
                  <span className="service-tag blurred">Digital Humans</span>
                  <span className="service-tag blurred">Real-time VFX</span>
                </div>
                <div className="vendor-locked-details">
                  <div className="locked-content">
                    <div className="locked-item">Pipeline Details</div>
                    <div className="locked-item">Technical Specs</div>
                    <div className="locked-item">Partnership Terms</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="showcase-unlock-cta">
              <div className="unlock-content">
                <h3 className="unlock-title">
                  Unlock the Full Vendor Directory
                </h3>
                <p className="unlock-description">
                  Access VOE-audited vendors, self-declared data, and
                  non-audited profile information in one transparent directory
                  for side-by-side comparison.
                </p>
                <div className="unlock-actions">
                  <Link to="/register" className="btn btn-primary-gold btn-lg">
                    Join the Club
                  </Link>
                </div>
                <p className="unlock-exclusivity">
                  Exclusive access for approved professionals and partners
                </p>
              </div>
            </div>
          </div>
        </section>
      )}
      <br />
      <br />
      {/* Assessor Network Section */}
      <AssessorsSection />

      {/* About The Seal Section - Editorial Layout */}
      <section className="about-section-editorial">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">About</span>
            <h2 className="section-title">About The Seal</h2>
            <p className="section-subtitle">
              A selective marketplace built for VFX studio decision-makers
            </p>
          </div>

          <div className="about-editorial-layout">
            {/* Left Column - Content */}
            <div className="about-content-column">
              {/* Highlight Introduction Box */}
              <div className="about-highlight-box">
                <p>
                  The Seal is a selective marketplace where VFX studios can
                  freely access vendor information, compare capabilities, and
                  research partners before engagement.
                </p>
                <br />
                <p>
                  Our role is marketplace access and transparency: every vendor
                  profile indicates the verification level, so professionals can
                  immediately distinguish audited facts from non-audited data.
                </p>
              </div>

              {/* Feature List */}
              <div className="about-features-list">
                <div className="about-feature-item">
                  <div className="feature-separator"></div>
                  <div className="feature-content">
                    <h3>Exclusive</h3>
                    <p>
                      Built for VFX studio professionals and decision-makers who
                      need a serious, curated environment for vendor comparison.
                    </p>
                  </div>
                </div>

                <div className="about-feature-item">
                  <div className="feature-separator"></div>
                  <div className="feature-content">
                    <h3>No-Paywall Access</h3>
                    <p>
                      Vendor profile access is free for studios. The marketplace
                      is designed for open research and comparison, not
                      paywalled discovery.
                    </p>
                  </div>
                </div>

                <div className="about-feature-item">
                  <div className="feature-separator"></div>
                  <div className="feature-content">
                    <h3>Verified & Certified Vendor Network</h3>
                    <p>
                      The Seal shows multiple trust levels: VOE-audited and
                      certified vendors, self-declared information, and
                      non-audited data - each clearly labeled.
                    </p>
                  </div>
                </div>

                <div className="about-feature-item">
                  <div className="feature-separator"></div>
                  <div className="feature-content">
                    <h3>Direct Access & Full Autonomy</h3>
                    <p>
                      Browse, compare, and contact vendors directly with no
                      intermediary model and no platform commission on your
                      relationships.
                    </p>
                  </div>
                </div>

                <div className="about-feature-item">
                  <div className="feature-separator"></div>
                  <div className="feature-content">
                    <h3>Strict Data Privacy & Confidentiality</h3>
                    <p>
                      Confidentiality is built in. Users control contact
                      disclosure and can research vendors discreetly before
                      opening communication.
                    </p>
                  </div>
                </div>

                <div className="about-feature-item">
                  <div className="feature-separator"></div>
                  <div className="feature-content">
                    <h3>360° Insight & Vendor Comparison</h3>
                    <p>
                      Compare operational strengths, project fit, and trust
                      levels side by side to choose the best vendor for each
                      production need.
                    </p>
                  </div>
                </div>

                <div className="about-feature-item">
                  <div className="feature-separator"></div>
                  <div className="feature-content">
                    <h3>Transparent Verification</h3>
                    <p>
                      The platform makes verification status explicit, so teams
                      always know what has been independently audited and what
                      remains vendor-declared.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Premium Image */}
            <div className="about-image-column">
              <div className="about-feature-image">
                <img
                  src={aboutImage}
                  alt="Modern architecture spiral staircase"
                  className="about-main-image"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="seal-voe-section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Transparency</span>
            <h2 className="section-title">
              The Seal & VOE – How it works together
            </h2>
          </div>

          <div className="seal-voe-grid">
            <article className="seal-voe-card">
              <p>
                The Seal is a completely free marketplace and research platform
                for VFX professionals.
              </p>
              <p>
                It exists thanks to our partnership with{" "}
                <b>VOE(VFX Operational Excellence)</b> , an independent audit
                label dedicated to VFX studios and vendors. VOE is the audit and
                certification body: their expert panel reviews and validates the
                operational information provided by vendors.
              </p>

              <div className="voe-brand-row">
                <img
                  src={voeLogo}
                  alt="VOE - VFX Operational Excellence"
                  className="voe-brand-logo"
                />
                <a
                  href="https://voe-standard.vercel.app"
                  target="_blank"
                  rel="noreferrer"
                  className="voe-brand-link"
                >
                  Visit VOE Website
                </a>
              </div>

              <p>On The Seal, you will find different levels of information:</p>
              <p>
                <b>* VOE-audited vendors</b> – clearly highlighted. Their
                information and reports have been reviewed by VOE experts.
              </p>
              <p>
                <b> * Self-declared / non-audited information</b> – still
                visible, but explicitly labelled as "not audited by VOE".
              </p>
              <p>
                This way, professionals keep full access to the marketplace
                while always knowing exactly what has been verified and what has
                not.
              </p>

              <p className="seal-voe-closing">
                The Seal provides open access and comparison; VOE provides the
                independent audit that makes trusted, verified information
                possible.
              </p>
            </article>

            <article className="seal-voe-card">
              <h3 className="seal-voe-subtitle">
                Request an Audit via The Seal
              </h3>
              <p>
                Through The Seal, you can also request an audit for a vendor by
                the VOE, or send us a message if there is specific information
                you would like to see audited before working with a studio.
              </p>
              <p>
                The studio will receive a notification that a professional user
                has requested an audit or a deeper verification of certain
                information or aspects of their profile. You can choose to
                remain anonymous,show only hte company you work for or open a
                direct conversation with them.
              </p>
              <p>
                We encourage open communication between member and vendors, but
                we keeping the confidentiality of our members as a priority. It
                is always they choice to to the first step of communciation.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-card">
            <div className="cta-glow" />
            <h2>Ready to Elevate Your VFX Partnerships?</h2>
            <p>
              Join hundreds of studios who trust VFX Seal to find the best
              certified vendors worldwide.
            </p>
            <div className="cta-buttons">
              <Link to={getStartedLink} className="btn btn-primary btn-xl">
                {isLoggedIn ? "Browse Vendors" : "Get Started"}
              </Link>
              {!isLoggedIn && (
                <Link to="/login" className="btn btn-outline btn-xl">
                  Already a Member? Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

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
