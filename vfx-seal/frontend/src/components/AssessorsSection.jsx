// Import all assessor company logos
import dnegLogo from "../assets/assessors_companies/DNEG-Logo-Red.png";
import epartnerLogo from "../assets/assessors_companies/Epartner_rise.png";
import folksVfxLogo from "../assets/assessors_companies/FOLKS-VFX-2.png";
import framestoreLogo from "../assets/assessors_companies/Framestore-blue-2100x550-c-default.png";
import mpcLogo from "../assets/assessors_companies/mpc-vfx-logo-transparent.png";
import netflixLogo from "../assets/assessors_companies/Netflix-Brand-Logo.png";
import pitchBlackLogo from "../assets/assessors_companies/PitchBlackpng.png";
import rodeoFxLogo from "../assets/assessors_companies/RODEO_FX_Simple_K_RGB.png";
import scanlineVfxLogo from "../assets/assessors_companies/ScanlineVFX_short.png";
import trixterLogo from "../assets/assessors_companies/TRIXTER_Studios.webp";

// Assessor companies data
const assessorCompanies = [
  {
    name: "DNEG",
    src: dnegLogo,
    alt: "DNEG Visual Effects",
  },
  {
    name: "Epartner Rise",
    src: epartnerLogo,
    alt: "Epartner Rise Studios",
  },
  {
    name: "Folks VFX",
    src: folksVfxLogo,
    alt: "Folks VFX Studio",
  },
  {
    name: "Framestore",
    src: framestoreLogo,
    alt: "Framestore Visual Effects",
  },
  {
    name: "MPC",
    src: mpcLogo,
    alt: "MPC Visual Effects",
  },
  {
    name: "Netflix",
    src: netflixLogo,
    alt: "Netflix Studios",
  },
  {
    name: "Pitch Black",
    src: pitchBlackLogo,
    alt: "Pitch Black Studios",
  },
  {
    name: "Rodeo FX",
    src: rodeoFxLogo,
    alt: "Rodeo FX Studios",
  },
  {
    name: "Scanline VFX",
    src: scanlineVfxLogo,
    alt: "Scanline VFX Studios",
  },
  {
    name: "Trixter Studios",
    src: trixterLogo,
    alt: "Trixter Studios",
  },
];

export default function AssessorsSection() {
  // Duplicate the array to create seamless infinite scrolling
  const duplicatedCompanies = [...assessorCompanies, ...assessorCompanies];

  return (
    <section className="assessors-section">
      <div className="container">
        <div className="section-header">
          <span className="section-tag">Network</span>
          <h2 className="section-title">Our Studio Network</h2>
          <p className="section-subtitle">
            Our members are production-side VFX studios who use The Seal to
            search, review and shortlist certified vendors with confidence.
          </p>
        </div>

        <div className="assessors-container">
          <div className="assessors-carousel-track">
            {duplicatedCompanies.map((company, index) => (
              <div key={`${company.name}-${index}`} className="assessor-card">
                <div className="assessor-logo-container">
                  <img
                    src={company.src}
                    alt={company.alt}
                    className="assessor-logo"
                    loading="lazy"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
