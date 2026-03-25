import { useState, useEffect } from "react";
import {
  FiUser,
  FiMail,
  FiHome,
  FiGlobe,
  FiBriefcase,
  FiLinkedin,
  FiLock,
  FiX,
  FiCheck,
} from "react-icons/fi";
import api from "../api/client";

export default function EditProfileModal({
  isOpen,
  onClose,
  user,
  onProfileUpdate,
}) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    country: "",
    roleInCompany: "",
    linkedin: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        company: user.company || "",
        country: user.country || "",
        roleInCompany: user.roleInCompany || "",
        linkedin: user.linkedin || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setError("");
      setSuccess("");
      setShowPasswordFields(false);
    }
  }, [isOpen, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Validate passwords if changing
      if (showPasswordFields) {
        if (formData.newPassword !== formData.confirmPassword) {
          throw new Error("New passwords do not match");
        }
        if (formData.newPassword && formData.newPassword.length < 6) {
          throw new Error("New password must be at least 6 characters");
        }
      }

      const updateData = {
        name: formData.name,
        email: formData.email,
        company: formData.company,
        country: formData.country,
        roleInCompany: formData.roleInCompany,
        linkedin: formData.linkedin,
      };

      if (showPasswordFields && formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }

      const response = await api.put("/auth/profile", updateData);

      setSuccess("Profile updated successfully!");
      onProfileUpdate(response.data.user);

      // Reset password fields
      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      setShowPasswordFields(false);

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to update profile",
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
          <h2>Edit Profile</h2>
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
                Full Name
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
                required
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

          <div className="password-section">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowPasswordFields(!showPasswordFields)}
            >
              <FiLock className="button-icon" />
              {showPasswordFields
                ? "Cancel Password Change"
                : "Change Password"}
            </button>

            {showPasswordFields && (
              <div className="password-fields">
                <div className="form-group">
                  <label htmlFor="currentPassword">Current Password</label>
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="newPassword">New Password</label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    className="form-input"
                    minLength="6"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm New Password</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="form-input"
                    minLength="6"
                    required
                  />
                </div>
              </div>
            )}
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
              {loading ? "Updating..." : "Update Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
