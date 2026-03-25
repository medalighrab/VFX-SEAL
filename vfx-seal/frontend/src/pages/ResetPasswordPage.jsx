import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import sealLogo from "../assets/seal.png";

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { resetPassword } = useAuth();

  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tokenValid, setTokenValid] = useState(true);

  useEffect(() => {
    // Validate token format (basic check)
    if (!token || token.length < 32) {
      setTokenValid(false);
      setError("Invalid or expired reset link");
    }
  }, [token]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.password || !form.confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await resetPassword(token, form.password);
      // The resetPassword function handles auto-login and navigation
      // So we don't need to do anything else here
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to reset password. The link may be expired or invalid.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!tokenValid) {
    return (
      <div className="auth-page">
        <Link to="/login" className="auth-back-arrow">
          ← Back to Login
        </Link>
        <div className="auth-card fade-in">
          <div className="auth-header">
            <Link to="/" className="auth-logo">
              <img
                src={sealLogo}
                alt="The Seal Logo"
                className="auth-logo-img"
              />
              <div className="auth-logo-text">
                VFX <span className="accent">Seal</span>
              </div>
            </Link>
            <p className="auth-subtitle">Invalid Reset Link</p>
          </div>

          <div className="alert alert-error">
            ⚠ This password reset link is invalid or has expired.
          </div>

          <div style={{ textAlign: "center", marginTop: "var(--space-lg)" }}>
            <Link
              to="/forgot-password"
              className="btn btn-primary"
              style={{ marginRight: "var(--space-sm)" }}
            >
              Request New Link
            </Link>
            <Link to="/login" className="btn btn-secondary">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <Link to="/login" className="auth-back-arrow">
        ← Back to Login
      </Link>
      <div className="auth-card fade-in">
        <div className="auth-header">
          <Link to="/" className="auth-logo">
            <img src={sealLogo} alt="The Seal Logo" className="auth-logo-img" />
            <div className="auth-logo-text">
              VFX <span className="accent">Seal</span>
            </div>
          </Link>
          <p className="auth-subtitle">Create your new password</p>
        </div>

        {error && <div className="alert alert-error">⚠ {error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="reset-password">
              New Password
            </label>
            <div className="password-input-container">
              <input
                id="reset-password"
                name="password"
                type={showPassword ? "text" : "password"}
                className="form-input password-input"
                placeholder="Enter new password"
                value={form.password}
                onChange={handleInputChange}
                required
                autoFocus
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
            <div
              className="form-help-text"
              style={{
                fontSize: "0.8rem",
                color: "var(--text-muted)",
                marginTop: "var(--space-xs)",
              }}
            >
              Must be at least 6 characters
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reset-confirm-password">
              Confirm New Password
            </label>
            <div className="password-input-container">
              <input
                id="reset-confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                className="form-input password-input"
                placeholder="Confirm new password"
                value={form.confirmPassword}
                onChange={handleInputChange}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: "100%" }}
          >
            {loading ? "Resetting Password..." : "Reset Password"}
          </button>
        </form>

        <div className="auth-footer">
          Remember your password? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
