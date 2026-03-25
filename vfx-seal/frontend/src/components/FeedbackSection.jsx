import { useState, useEffect } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { FiStar, FiEdit } from "react-icons/fi";

export default function FeedbackSection({ vendorId, vendorName, vendorSlug }) {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [myFeedback, setMyFeedback] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchFeedbacks();
  }, [vendorId]);

  const fetchFeedbacks = async () => {
    try {
      const { data } = await api.get(`/feedbacks/vendor/${vendorId}`);
      setFeedbacks(data.feedbacks);
      setAvgRating(data.avgRating);
      setTotalRatings(data.totalRatings);
      setMyFeedback(data.myFeedback);
    } catch (err) {
      console.error("Fetch feedbacks error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select a rating");
      return;
    }
    if (!message.trim()) {
      setError("Please enter a message");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await api.post("/feedbacks", {
        vendorId,
        vendorSlug,
        vendorName,
        rating,
        message,
      });
      setSuccess("Review submitted successfully!");
      setRating(0);
      setMessage("");
      fetchFeedbacks();
    } catch (err) {
      const apiMessage = err.response?.data?.message;
      const apiStage = err.response?.data?.stage;
      const apiReason = err.response?.data?.reason;
      const details = [apiStage, apiReason].filter(Boolean).join(" — ");
      setError(
        details
          ? `${apiMessage || "Failed to submit feedback"} (${details})`
          : apiMessage || "Failed to submit feedback",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (value, size = "md") => {
    return (
      <div className={`stars stars-${size}`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={`star ${star <= value ? "filled" : ""}`}>
            ★
          </span>
        ))}
      </div>
    );
  };

  const renderInteractiveStars = () => {
    return (
      <div className="stars stars-interactive">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`star ${star <= (hoverRating || rating) ? "filled" : ""}`}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading)
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );

  return (
    <div className="feedback-section">
      {/* Collapsible Accordion Header */}
      <div
        className={`accordion-item reviews-accordion ${isOpen ? "open" : ""}`}
      >
        <div
          className="accordion-header reviews-accordion-header"
          onClick={() => setIsOpen(!isOpen)}
          id="ratings-reviews-toggle"
        >
          <div className="accordion-header-left">
            <span className="accordion-section-name">Ratings & Reviews</span>
            <span className="accordion-score reviews-summary-inline">
              {avgRating.toFixed(1)} / 5 — {totalRatings} review
              {totalRatings !== 1 ? "s" : ""}
            </span>
          </div>
          <span className="accordion-chevron">▼</span>
        </div>

        <div className="accordion-body">
          <div className="accordion-content">
            {/* Rating Summary */}
            <div className="feedback-summary">
              <div className="feedback-summary-left">
                <div className="feedback-avg-rating">
                  {avgRating.toFixed(1)}
                </div>
                {renderStars(Math.round(avgRating), "lg")}
                <div className="feedback-total">
                  {totalRatings} review{totalRatings !== 1 ? "s" : ""}
                </div>
              </div>
            </div>

            {/* Studio Reviews — Approved + Rejected */}
            {feedbacks.length > 0 && (
              <div className="feedback-list">
                <h3>💬 Studio Reviews</h3>
                {feedbacks.map((fb) => (
                  <div
                    className={`feedback-item ${fb.status === "REJECTED" ? "feedback-rejected" : ""} ${fb.status === "HIDDEN" ? "feedback-hidden" : ""}`}
                    key={fb._id}
                  >
                    {fb.status === "REJECTED" ? (
                      <>
                        {/* Blurred/faded rejected review */}
                        <div className="feedback-rejected-content">
                          <div className="feedback-item-header">
                            <div className="feedback-item-studio">
                              <div className="feedback-item-avatar">
                                {fb.studioName.charAt(0)}
                              </div>
                              <div>
                                <div className="feedback-item-name">
                                  {fb.studioName}
                                </div>
                                <div className="feedback-item-date">
                                  {formatDate(fb.createdAt)}
                                </div>
                              </div>
                            </div>
                            {renderStars(fb.rating, "sm")}
                          </div>
                          <p className="feedback-item-message">{fb.message}</p>
                        </div>
                        <div className="feedback-rejected-notice">
                          This review was removed due to inappropriate or
                          violent content.
                        </div>
                      </>
                    ) : fb.status === "HIDDEN" ? (
                      <>
                        {/* Hidden/flagged feedback for regular users */}
                        <div className="feedback-hidden-content">
                          <div className="feedback-item-header">
                            <div className="feedback-item-studio">
                              <div className="feedback-item-avatar">
                                {fb.studioName.charAt(0)}
                              </div>
                              <div>
                                <div className="feedback-item-name">
                                  {fb.studioName}
                                </div>
                                <div className="feedback-item-date">
                                  {formatDate(fb.createdAt)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="feedback-hidden-notice">
                          {fb.message}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="feedback-item-header">
                          <div className="feedback-item-studio">
                            <div className="feedback-item-avatar">
                              {fb.studioName.charAt(0)}
                            </div>
                            <div>
                              <div className="feedback-item-name">
                                {fb.studioName}
                              </div>
                              <div className="feedback-item-date">
                                {formatDate(fb.createdAt)}
                              </div>
                            </div>
                          </div>
                          {renderStars(fb.rating, "sm")}
                        </div>
                        <p className="feedback-item-message">{fb.message}</p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {feedbacks.length === 0 && (
              <div
                className="empty-state"
                style={{ padding: "var(--space-xl)" }}
              >
                <div className="empty-state-icon"></div>
                <h3>No reviews yet</h3>
                <p>Be the first to share your experience with {vendorName}.</p>
              </div>
            )}

            {/* My Feedback Status */}
            {myFeedback && (
              <div
                className={`feedback-my-status ${myFeedback.status.toLowerCase()}`}
              >
                <div className="feedback-my-status-header">
                  <span>Your Feedback</span>
                  <span
                    className={`status-badge ${myFeedback.status.toLowerCase()}`}
                  >
                    {myFeedback.status}
                  </span>
                </div>
                <div className="feedback-my-content">
                  {renderStars(myFeedback.rating)}
                  <p>{myFeedback.message}</p>
                </div>
                {myFeedback.status === "REJECTED" && myFeedback.adminNote && (
                  <div className="feedback-admin-note">
                    <strong>Admin note:</strong> {myFeedback.adminNote}
                  </div>
                )}
              </div>
            )}

            {/* Leave Review Form (any logged-in user, once per vendor) */}
            {user && !myFeedback && (
              <div className="feedback-form-card">
                <h3>Leave a Review</h3>
                <p className="feedback-form-subtitle">
                  Share your experience with {vendorName}
                </p>
                {error && <div className="alert alert-error">{error}</div>}
                {success && (
                  <div className="alert alert-success">{success}</div>
                )}
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label className="form-label">Rating</label>
                    {renderInteractiveStars()}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="feedback-message">
                      Your Review
                    </label>
                    <textarea
                      className="form-input form-textarea"
                      id="feedback-message"
                      placeholder="Share your experience..."
                      rows="4"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      maxLength={2000}
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? (
                      "Submitting..."
                    ) : (
                      <>
                        <FiEdit size={16} style={{ marginRight: "8px" }} />
                        Submit Review
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {!user && (
              <div
                className="messages-empty"
                style={{ marginTop: "var(--space-md)" }}
              >
                Log in to leave a review and comment.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
