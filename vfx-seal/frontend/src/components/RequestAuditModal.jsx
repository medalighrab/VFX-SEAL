import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import TermsModal from "./TermsModal";
import {
  FiX,
  FiAlertTriangle,
  FiEye,
  FiEyeOff,
  FiCheck,
  FiClock,
} from "react-icons/fi";

export default function RequestAuditModal({
  isOpen,
  onClose,
  vendor,
  sectionName,
  itemName,
  itemType,
  onSuccess,
}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [quota, setQuota] = useState(null);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    isAnonymous: false,
    message: "",
    termsAccepted: false,
  });

  // Fetch user's current quota when modal opens
  useEffect(() => {
    if (isOpen && user) {
      fetchQuota();
      // Lock body scroll when modal opens
      document.body.style.overflow = "hidden";
    } else {
      // Restore body scroll when modal closes
      document.body.style.overflow = "unset";
    }

    // Cleanup function to ensure scroll is restored
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, user]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !loading) {
        if (showTermsModal) {
          setShowTermsModal(false);
          return;
        }
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, loading, showTermsModal]);

  const fetchQuota = async () => {
    try {
      const { data } = await api.get("/audit-requests/quota");
      setQuota(data.quota);
    } catch (err) {
      console.error("Error fetching quota:", err);
      setQuota({ used: 0, remaining: 5, canRequest: true }); // Fallback
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Clear error when user starts typing
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.termsAccepted) {
      setError("You must agree to the Terms and Conditions to proceed.");
      return;
    }

    if (!vendor || !sectionName || !itemName || !itemType) {
      setError("Missing required information. Please close and try again.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.post("/audit-requests", {
        vendorId: vendor._id,
        sectionName: sectionName,
        itemName: itemName,
        itemType: itemType,
        isAnonymous: formData.isAnonymous,
        message: formData.message,
      });

      setSuccess(true);
      setQuota(response.data.quota);

      // Call success callback if provided
      if (onSuccess) {
        onSuccess(response.data.request);
      }

      // Auto-close after success message
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || "Failed to submit audit request";
      setError(errorMessage);

      // Update quota if provided in error response
      if (err.response?.data?.quota) {
        setQuota(err.response.data.quota);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      // Restore body scroll before closing
      document.body.style.overflow = "unset";
      setFormData({
        isAnonymous: false,
        message: "",
        termsAccepted: false,
      });
      setError("");
      setSuccess(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !showTermsModal) {
          handleClose();
        }
      }}
    >
      <div
        className="modal-content request-audit-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">
            <FiAlertTriangle className="modal-icon" />
            Request Audit/Verification
          </h2>
          <button
            className="modal-close"
            onClick={handleClose}
            disabled={loading}
            aria-label="Close modal"
          >
            <FiX />
          </button>
        </div>

        <div className="modal-body">
          {success ? (
            <div className="success-message">
              <FiCheck className="success-icon" />
              <h3>Request Submitted Successfully!</h3>
              <p>
                Your audit request has been sent. We'll notify you when there's
                an update.
              </p>
            </div>
          ) : (
            <>
              {/* Request Details */}
              <div className="request-details">
                <h3>Request Details</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Vendor:</label>
                    <span>{vendor?.name}</span>
                  </div>
                  <div className="detail-item">
                    <label>Section:</label>
                    <span>{sectionName}</span>
                  </div>
                  <div className="detail-item">
                    <label>Item:</label>
                    <span>{itemName}</span>
                  </div>
                  <div className="detail-item">
                    <label>Type:</label>
                    <span className={`item-type ${itemType}`}>
                      {itemType === "unverified"
                        ? "Declared — Not Verified"
                        : "Not Validated"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quota Display */}
              {quota && (
                <div className="quota-display">
                  <div className="quota-info">
                    <FiClock className="quota-icon" />
                    <span>
                      Daily Requests: {quota.used}/5 used, {quota.remaining}{" "}
                      remaining
                    </span>
                  </div>
                  {!quota.canRequest && (
                    <div className="quota-warning">
                      <FiAlertTriangle />
                      Daily request limit reached. Please try again tomorrow.
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Visibility Choice */}
                <div className="form-section">
                  <h4>Request Visibility</h4>
                  <div className="visibility-options">
                    <label
                      className={`visibility-option ${!formData.isAnonymous ? "selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="isAnonymous"
                        value={false}
                        checked={!formData.isAnonymous}
                        onChange={() =>
                          setFormData((prev) => ({
                            ...prev,
                            isAnonymous: false,
                          }))
                        }
                      />
                      <div className="option-content">
                        <div className="option-header">
                          <FiEye className="option-icon" />
                          <span className="option-title">Be Visible</span>
                        </div>
                        <p className="option-description">
                          Show your studio name to the vendor. This increases
                          the chance they accept the audit request.
                        </p>
                      </div>
                    </label>

                    <label
                      className={`visibility-option ${formData.isAnonymous ? "selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="isAnonymous"
                        value={true}
                        checked={formData.isAnonymous}
                        onChange={() =>
                          setFormData((prev) => ({
                            ...prev,
                            isAnonymous: true,
                          }))
                        }
                      />
                      <div className="option-content">
                        <div className="option-header">
                          <FiEyeOff className="option-icon" />
                          <span className="option-title">Be Anonymous</span>
                        </div>
                        <p className="option-description">
                          Send the request anonymously without revealing your
                          studio identity.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Optional Message */}
                <div className="form-group">
                  <label htmlFor="message">Additional Message (Optional)</label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    placeholder="Add any additional context or specific requirements..."
                    maxLength={500}
                    rows={3}
                  />
                  <div className="char-count">
                    {formData.message.length}/500 characters
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="termsAccepted"
                      checked={formData.termsAccepted}
                      onChange={handleInputChange}
                      required
                    />
                    <span className="checkmark"></span>
                    <span className="checkbox-text">
                      I agree to the{" "}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowTermsModal(true);
                        }}
                        className="terms-link-button"
                      >
                        Terms and Conditions
                      </button>
                    </span>
                  </label>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="error-message">
                    <FiAlertTriangle />
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleClose}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={
                      loading || !quota?.canRequest || !formData.termsAccepted
                    }
                  >
                    {loading ? (
                      <>
                        <div className="spinner"></div>
                        Submitting...
                      </>
                    ) : (
                      "Submit Request"
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Terms Modal - Higher z-index to appear above Request modal */}
      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />
    </div>
  );
}
