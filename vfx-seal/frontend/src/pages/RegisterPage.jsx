import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import TermsModal from "../components/TermsModal";
import sealLogo from "../assets/seal.png";

const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "France",
  "Germany",
  "India",
  "Australia",
  "Japan",
  "South Korea",
  "New Zealand",
  "China",
  "Spain",
  "Italy",
  "Brazil",
  "Mexico",
  "Sweden",
  "Netherlands",
  "Belgium",
  "Singapore",
  "Thailand",
  "Other",
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    password: "",
    country: "",
    roleInCompany: "",
    linkedin: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const gmailRegex = /^[^\s@]+@gmail\.com$/i;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (
      !form.name ||
      !form.company ||
      !form.email ||
      !form.password ||
      !form.country ||
      !form.roleInCompany
    ) {
      setError("Please fill in all required fields");
      return;
    }

    if (!acceptedTerms) {
      setError("Please accept the Terms and Conditions to continue");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (!gmailRegex.test(form.email)) {
      setError("Please register with a valid Gmail address");
      return;
    }

    setLoading(true);
    try {
      await register(form);
      navigate("/login", { state: { registered: true } });
    } catch (err) {
      setError(
        err.response?.data?.message || "Registration failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <Link to="/" className="auth-back-arrow">
        ← Back to Home
      </Link>
      <div className="auth-card fade-in" style={{ maxWidth: 560 }}>
        <div className="auth-header">
          <Link to="/" className="auth-logo">
            <img src={sealLogo} alt="The Seal Logo" className="auth-logo-img" />
            <div className="auth-logo-text">
              VFX <span className="accent">Seal</span>
            </div>
          </Link>
          <p className="auth-subtitle">
            Create your professional account to request trusted profile access:
          </p>
        </div>

        {error && <div className="alert alert-error">⚠ {error}</div>}

        <form className="auth-form" onSubmit={handleSubmit} id="register-form">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="reg-name">
                Full Name *
              </label>
              <input
                id="reg-name"
                name="name"
                className="form-input"
                placeholder="John Doe"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-company">
                Studio / Company *
              </label>
              <input
                id="reg-company"
                name="company"
                className="form-input"
                placeholder="Studio Name"
                value={form.company}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">
              Official Gmail *
            </label>
            <input
              id="reg-email"
              name="email"
              className="form-input"
              type="email"
              placeholder="yourname@gmail.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="reg-country">
                Country *
              </label>
              <select
                id="reg-country"
                name="country"
                className="form-select"
                value={form.country}
                onChange={handleChange}
                required
              >
                <option value="">Select country</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-role">
                Role in Company *
              </label>
              <input
                id="reg-role"
                name="roleInCompany"
                className="form-input"
                placeholder="VFX Supervisor"
                value={form.roleInCompany}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">
              Password *
            </label>
            <div className="password-input-container">
              <input
                id="reg-password"
                name="password"
                className="form-input password-input"
                type={showPassword ? "text" : "password"}
                placeholder="Min 6 characters"
                value={form.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-linkedin">
              LinkedIn Profile (optional)
            </label>
            <input
              id="reg-linkedin"
              name="linkedin"
              className="form-input"
              placeholder="https://linkedin.com/in/yourprofile"
              value={form.linkedin}
              onChange={handleChange}
            />
          </div>

          <div className="form-group" style={{ marginTop: "20px" }}>
            <label
              className="form-label"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                style={{
                  width: "18px",
                  height: "18px",
                  accentColor: "var(--accent)",
                  cursor: "pointer",
                }}
              />
              <span>
                I accept The Seal's{" "}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--accent)",
                    textDecoration: "underline",
                    cursor: "pointer",
                    padding: "0",
                    font: "inherit",
                  }}
                >
                  Terms and Conditions
                </button>
              </span>
            </label>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading || !acceptedTerms}
            id="register-submit"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>

      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />
    </div>
  );
}
