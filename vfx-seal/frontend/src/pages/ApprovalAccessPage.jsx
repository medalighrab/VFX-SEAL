import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ApprovalAccessPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { loginWithApprovalToken } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const signInWithApprovalToken = async () => {
      try {
        const user = await loginWithApprovalToken(token);
        if (!mounted) return;

        if (user.role === "ADMIN") {
          navigate("/admin", { replace: true });
          return;
        }

        if (user.status === "APPROVED") {
          navigate("/vendors", { replace: true });
          return;
        }

        navigate("/pending", { replace: true });
      } catch (err) {
        if (!mounted) return;
        setError(
          err.response?.data?.message ||
            "Your approval link is invalid or has expired.",
        );
      }
    };

    signInWithApprovalToken();

    return () => {
      mounted = false;
    };
  }, [loginWithApprovalToken, navigate, token]);

  return (
    <div className="auth-page">
      <div className="auth-card fade-in" style={{ maxWidth: 520 }}>
        {!error ? (
          <>
            <h2 style={{ marginBottom: 12 }}>Verifying your approval link</h2>
            <p className="auth-subtitle">Signing you in securely...</p>
          </>
        ) : (
          <>
            <h2 style={{ marginBottom: 12 }}>Approval link unavailable</h2>
            <div className="alert alert-error">{error}</div>
            <div className="auth-footer" style={{ marginTop: 16 }}>
              <Link to="/login">Go to login</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
