import { useState } from "react";
import api from "../api/client";

export default function ContactModal({ isOpen, onClose }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await api.post("/contact", { subject, message });
      setSuccess(true);
      setSubject("");
      setMessage("");
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSubject("");
    setMessage("");
    setError("");
    setSuccess(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content contact-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={handleClose}>
          ✕
        </button>
        <div className="modal-header">
          <h2>Contact Us</h2>
          <p>Send a message to the VFX Seal team</p>
        </div>

        {success ? (
          <div className="modal-success">
            <div className="modal-success-icon">Success</div>
            <h3>Message Sent!</h3>
            <p>We'll get back to you shortly.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-form">
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-group">
              <label className="form-label" htmlFor="contact-subject">
                Subject
              </label>
              <input
                className="form-input"
                id="contact-subject"
                type="text"
                placeholder="What's this about?"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={200}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="contact-message">
                Message
              </label>
              <textarea
                className="form-input form-textarea"
                id="contact-message"
                placeholder="Tell us more..."
                rows="5"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={5000}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
            >
              {loading ? "Sending..." : "📤 Send Message"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
