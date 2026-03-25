import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api/client";
import { FiFileText, FiCheck } from "react-icons/fi";

const EMPTY_SECTION = {
  sectionName: "",
  score: 0,
  validatedSkills: [],
  unverifiedSkills: [],
  nonValidatedSkills: [],
};

const DEFAULT_SECTIONS = [
  "Pipeline & Technology",
  "Team & Organization",
  "Quality Assurance",
  "Security & Compliance",
  "Delivery & Communication",
  "Scalability",
  "Creative Leadership",
  "Financial Stability",
  "Environmental & Social",
  "Client Satisfaction",
  "Innovation & R&D",
];

export default function AdminVendorForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [form, setForm] = useState({
    name: "",
    country: "",
    size: "Medium",
    foundedYear: "",
    website: "",
    demoReel: "",
    shortDescription: "",
    services: [],
    badgeVOE: "None",
    globalScore: 0,
    assessment: DEFAULT_SECTIONS.map((name) => ({
      ...EMPTY_SECTION,
      sectionName: name,
    })),
    pdfVisibility: "members",
  });
  const [logo, setLogo] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [serviceInput, setServiceInput] = useState("");

  useEffect(() => {
    if (isEditing) {
      setLoading(true);
      api
        .get(`/vendors`)
        .then(({ data }) => {
          const vendor = data.vendors.find((v) => v._id === id);
          if (vendor) {
            // Need to get full detail
            api.get(`/vendors/${vendor.slug}`).then(({ data: detailData }) => {
              const v = detailData.vendor;
              setForm({
                name: v.name || "",
                country: v.country || "",
                size: v.size || "Medium",
                foundedYear: v.foundedYear || "",
                website: v.website || "",
                demoReel: v.demoReel || "",
                shortDescription: v.shortDescription || "",
                services: v.services || [],
                badgeVOE: v.badgeVOE || "None",
                globalScore: v.globalScore || 0,
                assessment:
                  v.assessment?.length > 0
                    ? v.assessment
                    : DEFAULT_SECTIONS.map((name) => ({
                        ...EMPTY_SECTION,
                        sectionName: name,
                      })),
                pdfVisibility: v.pdfReport?.visibility || "members",
              });
              setLoading(false);
            });
          } else {
            setError("Vendor not found");
            setLoading(false);
          }
        })
        .catch(() => {
          setError("Failed to load vendor");
          setLoading(false);
        });
    }
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSectionChange = (idx, field, value) => {
    setForm((prev) => {
      const assessment = [...prev.assessment];
      assessment[idx] = { ...assessment[idx], [field]: value };
      return { ...prev, assessment };
    });
  };

  const handleSkillKeyDown = (e, idx, field) => {
    if (e.key === "Enter" && e.target.value.trim()) {
      e.preventDefault();
      const val = e.target.value.trim();
      setForm((prev) => {
        const assessment = [...prev.assessment];
        if (!assessment[idx][field].includes(val)) {
          assessment[idx] = {
            ...assessment[idx],
            [field]: [...assessment[idx][field], val],
          };
        }
        return { ...prev, assessment };
      });
      e.target.value = "";
    }
  };

  const removeSkill = (sectionIdx, field, skillIdx) => {
    setForm((prev) => {
      const assessment = [...prev.assessment];
      const skills = [...assessment[sectionIdx][field]];
      skills.splice(skillIdx, 1);
      assessment[sectionIdx] = { ...assessment[sectionIdx], [field]: skills };
      return { ...prev, assessment };
    });
  };

  const handleServiceKeyDown = (e) => {
    if (e.key === "Enter" && serviceInput.trim()) {
      e.preventDefault();
      if (!form.services.includes(serviceInput.trim())) {
        setForm((prev) => ({
          ...prev,
          services: [...prev.services, serviceInput.trim()],
        }));
      }
      setServiceInput("");
    }
  };

  const removeService = (idx) => {
    setForm((prev) => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("country", form.country);
      formData.append("size", form.size);
      formData.append("foundedYear", form.foundedYear);
      formData.append("website", form.website);
      formData.append("demoReel", form.demoReel);
      formData.append("shortDescription", form.shortDescription);
      formData.append("services", JSON.stringify(form.services));
      formData.append("badgeVOE", form.badgeVOE);
      formData.append("globalScore", form.globalScore);
      formData.append("assessment", JSON.stringify(form.assessment));
      formData.append("pdfVisibility", form.pdfVisibility);

      if (logo) formData.append("logo", logo);
      if (pdfFile) formData.append("pdfFile", pdfFile);

      if (isEditing) {
        await api.put(`/vendors/${id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.post("/vendors", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      navigate("/admin");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save vendor");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="page-wrapper">
        <div className="loading">
          <div className="spinner" />
        </div>
      </div>
    );

  return (
    <div className="page-wrapper">
      <div className="container">
        <Link to="/admin" className="back-link">
          ← Back to Admin
        </Link>
        <h1 style={{ marginBottom: "var(--space-xl)" }}>
          {isEditing ? "Edit Vendor" : "Create New Vendor"}
        </h1>

        {error && <div className="alert alert-error">{error}</div>}

        <form className="vendor-form" onSubmit={handleSubmit} id="vendor-form">
          <div className="form-grid">
            {/* Basic Info */}
            <div className="form-group">
              <label className="form-label">Vendor Name *</label>
              <input
                name="name"
                className="form-input"
                value={form.name}
                onChange={handleChange}
                required
                id="vendor-name"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Country *</label>
              <input
                name="country"
                className="form-input"
                value={form.country}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Size *</label>
              <select
                name="size"
                className="form-select"
                value={form.size}
                onChange={handleChange}
              >
                <option value="Micro">Micro</option>
                <option value="Small">Small</option>
                <option value="Medium">Medium</option>
                <option value="Large">Large</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Founded Year</label>
              <input
                name="foundedYear"
                className="form-input"
                type="number"
                value={form.foundedYear}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Website</label>
              <input
                name="website"
                className="form-input"
                value={form.website}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Demo Reel URL</label>
              <input
                name="demoReel"
                className="form-input"
                value={form.demoReel}
                onChange={handleChange}
              />
            </div>
            <div className="form-group form-grid-full">
              <label className="form-label">Short Description</label>
              <textarea
                name="shortDescription"
                className="form-textarea"
                value={form.shortDescription}
                onChange={handleChange}
              />
            </div>

            {/* Services */}
            <div className="form-group form-grid-full">
              <label className="form-label">
                Services (press Enter to add)
              </label>
              <div
                className="tags-input"
                onClick={(e) => e.currentTarget.querySelector("input")?.focus()}
              >
                {form.services.map((s, i) => (
                  <span className="tag" key={i}>
                    {s}{" "}
                    <button
                      type="button"
                      className="tag-remove"
                      onClick={() => removeService(i)}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  placeholder="e.g. CGI, Compositing..."
                  value={serviceInput}
                  onChange={(e) => setServiceInput(e.target.value)}
                  onKeyDown={handleServiceKeyDown}
                />
              </div>
            </div>

            {/* Badge & Score */}
            <div className="form-group">
              <label className="form-label">VOE Badge</label>
              <select
                name="badgeVOE"
                className="form-select"
                value={form.badgeVOE}
                onChange={handleChange}
              >
                <option value="None">None</option>
                <option value="Bronze">Bronze</option>
                <option value="Silver">Silver</option>
                <option value="Gold">Gold</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Global Score (/10)</label>
              <input
                name="globalScore"
                className="form-input"
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={form.globalScore}
                onChange={handleChange}
              />
            </div>

            {/* File Uploads */}
            <div className="form-group">
              <label className="form-label">Logo</label>
              <input
                type="file"
                accept="image/*"
                className="form-input"
                onChange={(e) => setLogo(e.target.files[0])}
              />
            </div>
            <div className="form-group">
              <label className="form-label">PDF Report</label>
              <input
                type="file"
                accept=".pdf"
                className="form-input"
                onChange={(e) => setPdfFile(e.target.files[0])}
              />
            </div>
            <div className="form-group">
              <label className="form-label">PDF Visibility</label>
              <select
                name="pdfVisibility"
                className="form-select"
                value={form.pdfVisibility}
                onChange={handleChange}
              >
                <option value="members">Members (approved studios)</option>
                <option value="private">Private (admin only)</option>
              </select>
            </div>

            {/* Assessment Sections */}
            <div className="section-divider">
              <h3>
                <FiFileText size={20} style={{ marginRight: "8px" }} />
                VOE Assessment Sections
              </h3>
            </div>
          </div>

          {form.assessment.map((section, idx) => (
            <div className="assessment-form-section" key={idx}>
              <h4>{section.sectionName || `Section ${idx + 1}`}</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Section Name</label>
                  <input
                    className="form-input"
                    value={section.sectionName}
                    onChange={(e) =>
                      handleSectionChange(idx, "sectionName", e.target.value)
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Score (/10)</label>
                  <input
                    className="form-input"
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={section.score}
                    onChange={(e) =>
                      handleSectionChange(
                        idx,
                        "score",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                  />
                </div>
                <div className="form-group form-grid-full">
                  <label
                    className="form-label"
                    style={{ color: "var(--skill-validated)" }}
                  >
                    <FiCheck size={14} style={{ marginRight: "4px" }} />
                    Validated Skills (Enter to add)
                  </label>
                  <div
                    className="tags-input"
                    onClick={(e) =>
                      e.currentTarget.querySelector("input")?.focus()
                    }
                  >
                    {section.validatedSkills.map((s, si) => (
                      <span
                        className="tag"
                        key={si}
                        style={{
                          background: "var(--skill-validated-bg)",
                          color: "var(--skill-validated)",
                        }}
                      >
                        {s}{" "}
                        <button
                          type="button"
                          className="tag-remove"
                          style={{ color: "var(--skill-validated)" }}
                          onClick={() =>
                            removeSkill(idx, "validatedSkills", si)
                          }
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      placeholder="Type skill, press Enter..."
                      onKeyDown={(e) =>
                        handleSkillKeyDown(e, idx, "validatedSkills")
                      }
                    />
                  </div>
                </div>
                <div className="form-group form-grid-full">
                  <label
                    className="form-label"
                    style={{ color: "var(--skill-unverified)" }}
                  >
                    ⚠ Unverified Skills (Enter to add)
                  </label>
                  <div
                    className="tags-input"
                    onClick={(e) =>
                      e.currentTarget.querySelector("input")?.focus()
                    }
                  >
                    {section.unverifiedSkills.map((s, si) => (
                      <span
                        className="tag"
                        key={si}
                        style={{
                          background: "var(--skill-unverified-bg)",
                          color: "var(--skill-unverified)",
                        }}
                      >
                        {s}{" "}
                        <button
                          type="button"
                          className="tag-remove"
                          style={{ color: "var(--skill-unverified)" }}
                          onClick={() =>
                            removeSkill(idx, "unverifiedSkills", si)
                          }
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      placeholder="Type skill, press Enter..."
                      onKeyDown={(e) =>
                        handleSkillKeyDown(e, idx, "unverifiedSkills")
                      }
                    />
                  </div>
                </div>
                <div className="form-group form-grid-full">
                  <label
                    className="form-label"
                    style={{ color: "var(--skill-nonvalidated)" }}
                  >
                    ✗ Non-Validated Skills (Enter to add)
                  </label>
                  <div
                    className="tags-input"
                    onClick={(e) =>
                      e.currentTarget.querySelector("input")?.focus()
                    }
                  >
                    {section.nonValidatedSkills.map((s, si) => (
                      <span
                        className="tag"
                        key={si}
                        style={{
                          background: "var(--skill-nonvalidated-bg)",
                          color: "var(--skill-nonvalidated)",
                        }}
                      >
                        {s}{" "}
                        <button
                          type="button"
                          className="tag-remove"
                          style={{ color: "var(--skill-nonvalidated)" }}
                          onClick={() =>
                            removeSkill(idx, "nonValidatedSkills", si)
                          }
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      placeholder="Type skill, press Enter..."
                      onKeyDown={(e) =>
                        handleSkillKeyDown(e, idx, "nonValidatedSkills")
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div
            style={{
              marginTop: "var(--space-xl)",
              display: "flex",
              gap: "var(--space-md)",
            }}
          >
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={saving}
              id="save-vendor-btn"
            >
              {saving
                ? "Saving..."
                : isEditing
                  ? "Update Vendor"
                  : "Create Vendor"}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-lg"
              onClick={() => navigate("/admin")}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
