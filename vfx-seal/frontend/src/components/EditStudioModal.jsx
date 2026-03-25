import { useState, useEffect } from "react";
import {
  FiUser,
  FiMail,
  FiHome,
  FiGlobe,
  FiBriefcase,
  FiLinkedin,
  FiX,
  FiCheck,
  FiSettings,
} from "react-icons/fi";
import api from "../api/client";

export default function EditStudioModal({
  isOpen,
  onClose,
  studio,
  onStudioUpdate,
}) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    country: "",
    roleInCompany: "",
    linkedin: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (isOpen && studio) {
      setFormData({
        name: studio.name || "",
        email: studio.email || "",
        company: studio.company || "",
        country: studio.country || "",
        roleInCompany: studio.roleInCompany || "",
        linkedin: studio.linkedin || "",
      });
      setError("");
      setSuccess("");
    }
  }, [isOpen, studio]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.put(`/admin/users/${studio._id}`, formData);

      setSuccess("Studio profile updated successfully!");
      onStudioUpdate(response.data.user);

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      setError(
        error.response?.data?.message || "Failed to update studio profile",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content edit-profile-modal">
        <div className="modal-header">
          <h2>
            <FiSettings className="modal-header-icon" />
            Edit Studio Profile
          </h2>
          <button className="modal-close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="edit-profile-form">
          {error && <div className="alert alert-error">{error}</div>}

          {success && (
            <div className="alert alert-success">
              <FiCheck className="alert-icon" />
              {success}
            </div>
          )}

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="name">
                <FiUser className="form-icon" />
                Studio Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">
                <FiMail className="form-icon" />
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="company">
                <FiHome className="form-icon" />
                Company
              </label>
              <input
                type="text"
                id="company"
                name="company"
                value={formData.company}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="country">
                <FiGlobe className="form-icon" />
                Country
              </label>
              <input
                type="text"
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="roleInCompany">
                <FiBriefcase className="form-icon" />
                Role in Company
              </label>
              <input
                type="text"
                id="roleInCompany"
                name="roleInCompany"
                value={formData.roleInCompany}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="linkedin">
                <FiLinkedin className="form-icon" />
                LinkedIn Profile (Optional)
              </label>
              <input
                type="url"
                id="linkedin"
                name="linkedin"
                value={formData.linkedin}
                onChange={handleChange}
                className="form-input"
                placeholder="https://linkedin.com/in/yourprofile"
              />
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Studio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
