import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import sealLogo from "../assets/seal.png";

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await forgotPassword(email.trim());
      setMessage(
        "If an account with that email exists, we've sent password reset instructions.",
      );
      setSubmitted(true);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to send reset email. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
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
            <p className="auth-subtitle">Check your email</p>
          </div>

          <div className="alert alert-success">✅ {message}</div>

          <div style={{ textAlign: "center", marginTop: "var(--space-lg)" }}>
            <p
              className="auth-footer"
              style={{ marginBottom: "var(--space-md)" }}
            >
              Didn't receive the email? Check your spam folder or{" "}
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent)",
                  textDecoration: "underline",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                try again
              </button>
            </p>

            <Link to="/login" className="btn btn-secondary">
              Return to Login
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
          <p className="auth-subtitle">Reset your password</p>
        </div>

        {error && <div className="alert alert-error">⚠ {error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="forgot-email">
              Email Address
            </label>
            <input
              id="forgot-email"
              type="email"
              className="form-input"
              placeholder="your.email@studio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
            <div
              className="form-help-text"
              style={{
                fontSize: "0.8rem",
                color: "var(--text-muted)",
                marginTop: "var(--space-xs)",
              }}
            >
              Enter your email address and we'll send you a link to reset your
              password.
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: "100%" }}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <div className="auth-footer">
          Remember your password? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
