import { useState, useRef } from "react";
import { useAdminBanners } from "../../../hooks/useBanners";
import { toast } from "react-toastify";
import "./BannerList.css";

const BANNER_TYPES = ["Slider", "ShortAd", "LongAd", "Sales", "Voucher"];

const BANNER_TYPE_COLORS: Record<string, string> = {
  Slider: "type-slider",
  ShortAd: "type-short",
  LongAd: "type-long",
  Sales: "type-sales",
  Voucher: "type-voucher",
};

export default function BannerList() {
  const { banners, total, loading, actionLoading, error, create, update, remove } =
    useAdminBanners(1, 100);

  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    link: "",
    ctaText: "",
    bannerType: "Slider",
    isVisible: true,
    image: null as File | null,
  });

  const formRef = useRef<HTMLFormElement>(null);

  /* ---------------- Open modal ---------------- */
  const openCreate = () => {
    setEditing(null);
    setImagePreview(null);
    setForm({
      title: "",
      description: "",
      link: "",
      ctaText: "",
      bannerType: "Slider",
      isVisible: true,
      image: null,
    });
    setShow(true);
  };

  const openEdit = (b: any) => {
    setEditing(b);
    setImagePreview(b.image_base64 || null);
    setForm({
      title: b.title || "",
      description: b.description || "",
      link: b.link || "",
      ctaText: b.ctaText || "",
      bannerType: b.bannerType || "Slider",
      isVisible: b.isVisible,
      image: null,
    });
    setShow(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setForm({ ...form, image: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  /* ---------------- Save ---------------- */
  const save = async () => {
    if (!formRef.current?.checkValidity()) {
      formRef.current?.reportValidity();
      return;
    }

    if (!form.image && !editing) {
      toast.error("Image is required");
      return;
    }

    const reqData = {
      title: form.title,
      description: form.description,
      link: form.link,
      ctaText: form.ctaText,
      bannerType: form.bannerType,
      isVisible: form.isVisible,
    };

    const formData = new FormData();
    formData.append("reqData", JSON.stringify(reqData));
    if (form.image) {
      formData.append("imagePath", form.image);
    }

    try {
      if (editing) {
        await update(editing.id, formData);
        if (!error) {
          toast.success("Banner updated successfully");
          setShow(false);
        }
      } else {
        await create(formData);
        if (!error) {
          toast.success("Banner created successfully");
          setShow(false);
        }
      }
    } catch (err) {
      // Error handled by hook
    }
  };

  const deleteRow = async (id: number) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this banner? This action cannot be undone."
      )
    ) {
      return;
    }

    await remove(id);
    if (!error) {
      toast.success("Banner deleted successfully");
    }
  };

  const getBannerTypeClass = (type: string) => {
    return BANNER_TYPE_COLORS[type] || "type-default";
  };

  return (
    <div className="banners-page">
      {/* Page Header */}
      <div className="banners-header">
        <div>
          <h2 className="banners-title">Banners Management</h2>
          <p className="banners-subtitle">
            Manage promotional banners and advertisements
          </p>
        </div>
        <div className="banners-stats">
          <div className="stat-item">
            <span className="stat-label">Total Banners</span>
            <span className="stat-value">{total}</span>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="actions-bar">
        <button className="btn btn-primary btn-add" onClick={openCreate}>
          <i className="bi bi-plus-circle-fill me-2"></i>
          Add New Banner
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="alert alert-danger alert-custom" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
        </div>
      )}

      {/* Banners Table - Desktop */}
     
      <div className="banners-table-card">
        {loading ? (
          <div className="loading-state">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3 text-muted">Loading banners...</p>
          </div>
        ) : banners.length === 0 ? (
          <div className="empty-state">
            <i className="bi bi-image empty-icon"></i>
            <h5 className="empty-title">No banners found</h5>
            <p className="empty-text">
              Get started by creating your first promotional banner
            </p>
            <button className="btn btn-primary" onClick={openCreate}>
              <i className="bi bi-plus-circle me-1"></i>
              Create Banner
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="table-responsive d-none d-md-block">
              <table className="table banners-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Preview</th>
                    <th>Title</th>
                    <th>Type</th>
                    <th>CTA Text</th>
                    <th>Link</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {banners.map((b: any, i: number) => (
                    <tr key={b.id} className="banner-row">
                      <td>
                        <div className="banner-number">{i + 1}</div>
                      </td>
                      <td>
                        <div className="banner-preview-wrapper">
                          {b.image_base64 ? (
                            <img
                              src={b.image_base64}
                              alt={b.title}
                              className="banner-preview"
                            />
                          ) : (
                            <div className="banner-preview-placeholder">
                              <i className="bi bi-image"></i>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="banner-title">{b.title}</div>
                        {b.description && (
                          <small className="text-muted d-block mt-1">
                            {b.description.length > 50
                              ? `${b.description.substring(0, 50)}...`
                              : b.description}
                          </small>
                        )}
                      </td>
                      <td>
                        <span
                          className={`banner-type-badge ${getBannerTypeClass(
                            b.bannerType
                          )}`}>
                          {b.bannerType}
                        </span>
                      </td>
                      <td>
                        <div className="banner-cta">
                          {b.ctaText || (
                            <span className="text-muted">No CTA</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="banner-link">
                          {b.link ? (
                            <a
                              href={b.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="link-preview">
                              <i className="bi bi-link-45deg me-1"></i>
                              View Link
                            </a>
                          ) : (
                            <span className="text-muted">No link</span>
                          )}
                        </div>
                      </td>
                      <td>
                        {b.isVisible ? (
                          <span className="status-badge status-visible">
                            <i className="bi bi-eye-fill me-1"></i>
                            Visible
                          </span>
                        ) : (
                          <span className="status-badge status-hidden">
                            <i className="bi bi-eye-slash-fill me-1"></i>
                            Hidden
                          </span>
                        )}
                      </td>
                      <td className="text-end">
                        <div className="action-buttons">
                          <button
                            className="btn btn-sm btn-edit"
                            onClick={() => openEdit(b)}
                            disabled={actionLoading}>
                            <i className="bi bi-pencil-fill me-1"></i>
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-delete"
                            onClick={() => deleteRow(b.id)}
                            disabled={actionLoading}>
                            <i className="bi bi-trash-fill me-1"></i>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="banners-mobile d-md-none">
              {banners.map((b: any) => (
                <div key={b.id} className="banner-card-mobile">
                  {/* Banner Image Preview */}
                  <div className="banner-preview-mobile-wrapper">
                    {b.image_base64 ? (
                      <img
                        src={b.image_base64}
                        alt={b.title}
                        className="banner-preview-mobile"
                      />
                    ) : (
                      <div className="banner-preview-placeholder-mobile">
                        <i className="bi bi-image"></i>
                        <p>No Image</p>
                      </div>
                    )}
                  </div>

                  {/* Banner Info */}
                  <div className="banner-card-content">
                    <div className="banner-card-header-mobile">
                      <div className="banner-title-mobile">{b.title}</div>
                      <div className="banner-header-badges">
                        <span
                          className={`banner-type-badge-mobile ${getBannerTypeClass(
                            b.bannerType
                          )}`}>
                          {b.bannerType}
                        </span>
                        {b.isVisible ? (
                          <span className="status-badge-mobile status-visible">
                            <i className="bi bi-eye-fill me-1"></i>
                            Visible
                          </span>
                        ) : (
                          <span className="status-badge-mobile status-hidden">
                            <i className="bi bi-eye-slash-fill me-1"></i>
                            Hidden
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="banner-card-body">
                      {b.description && (
                        <div className="banner-info-row">
                          <span className="info-label">
                            <i className="bi bi-text-paragraph me-1"></i>
                            Description
                          </span>
                          <span className="info-value">{b.description}</span>
                        </div>
                      )}

                      {b.ctaText && (
                        <div className="banner-info-row">
                          <span className="info-label">
                            <i className="bi bi-cursor me-1"></i>
                            CTA Text
                          </span>
                          <span className="info-value">{b.ctaText}</span>
                        </div>
                      )}

                      {b.link && (
                        <div className="banner-info-row">
                          <span className="info-label">
                            <i className="bi bi-link-45deg me-1"></i>
                            Link
                          </span>
                          <a
                            href={b.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link-preview-mobile">
                            {b.link.length > 35
                              ? `${b.link.substring(0, 35)}...`
                              : b.link}
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="banner-card-footer">
                      <button
                        className="btn btn-outline-primary btn-sm flex-fill me-2"
                        onClick={() => openEdit(b)}
                        disabled={actionLoading}>
                        <i className="bi bi-pencil-fill me-1"></i>
                        Edit
                      </button>
                      <button
                        className="btn btn-outline-danger btn-sm flex-fill"
                        onClick={() => deleteRow(b.id)}
                        disabled={actionLoading}>
                        <i className="bi bi-trash-fill me-1"></i>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      

      {/* Modal */}
      {show && (
        <div
          className="modal-overlay"
          onClick={() => !actionLoading && setShow(false)}>
          <div
            className="modal-content-custom"
            onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <h5 className="modal-title-custom">
                <i className="bi bi-image me-2"></i>
                {editing ? "Edit Banner" : "Create New Banner"}
              </h5>
              <button
                className="btn-close-custom"
                onClick={() => !actionLoading && setShow(false)}
                disabled={actionLoading}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <form
              ref={formRef}
              className="modal-body-custom"
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}>
              {/* Image Preview */}
              <div className="form-group-image">
                <label className="form-label-custom">
                  <i className="bi bi-image me-1"></i>
                  Banner Image <span className="required">*</span>
                </label>
                <div className="image-upload-wrapper">
                  {imagePreview ? (
                    <div className="image-preview-container">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="image-preview"
                      />
                      <button
                        type="button"
                        className="btn-remove-image"
                        onClick={() => {
                          setImagePreview(null);
                          setForm({ ...form, image: null });
                        }}>
                        <i className="bi bi-x-circle-fill"></i>
                      </button>
                    </div>
                  ) : (
                    <div className="image-upload-placeholder">
                      <i className="bi bi-cloud-upload"></i>
                      <p>Click to upload or drag and drop</p>
                      <small>PNG, JPG up to 5MB</small>
                    </div>
                  )}
                  <input
                    type="file"
                    className="image-input"
                    accept="image/*"
                    onChange={handleImageChange}
                    disabled={actionLoading}
                    required={!editing}
                  />
                </div>
              </div>

              {/* Title */}
              <div className="form-group">
                <label className="form-label-custom">
                  <i className="bi bi-type me-1"></i>
                  Title <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-control-custom"
                  placeholder="Enter banner title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  disabled={actionLoading}
                  required
                />
              </div>

              {/* Banner Type */}
              <div className="form-group">
                <label className="form-label-custom">
                  <i className="bi bi-tag-fill me-1"></i>
                  Banner Type <span className="required">*</span>
                </label>
                <select
                  className="form-control-custom"
                  value={form.bannerType}
                  onChange={(e) =>
                    setForm({ ...form, bannerType: e.target.value })
                  }
                  disabled={actionLoading}
                  required>
                  {BANNER_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label-custom">
                  <i className="bi bi-text-paragraph me-1"></i>
                  Description <span className="required">*</span>
                </label>
                <textarea
                  className="form-control-custom"
                  placeholder="Enter banner description"
                  rows={4}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  disabled={actionLoading}
                  required
                />
              </div>

              {/* Link & CTA Row */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label-custom">
                    <i className="bi bi-link-45deg me-1"></i>
                    Link <span className="required">*</span>
                  </label>
                  <input
                    type="url"
                    className="form-control-custom"
                    placeholder="https://example.com"
                    value={form.link}
                    onChange={(e) => setForm({ ...form, link: e.target.value })}
                    disabled={actionLoading}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label-custom">
                    <i className="bi bi-cursor me-1"></i>
                    CTA Text <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control-custom"
                    placeholder="Shop Now, Learn More, etc."
                    value={form.ctaText}
                    onChange={(e) =>
                      setForm({ ...form, ctaText: e.target.value })
                    }
                    disabled={actionLoading}
                    required
                  />
                </div>
              </div>

              {/* Visibility Toggle */}
              <div className="form-group-checkbox">
                <div className="checkbox-wrapper">
                  <input
                    type="checkbox"
                    className="form-check-input-custom"
                    id="isVisible"
                    checked={form.isVisible}
                    onChange={(e) =>
                      setForm({ ...form, isVisible: e.target.checked })
                    }
                    disabled={actionLoading}
                  />
                  <label className="form-check-label-custom" htmlFor="isVisible">
                    <i className="bi bi-eye-fill me-2"></i>
                    Make banner visible on website
                  </label>
                </div>
              </div>

              <div className="modal-footer-custom">
                <button
                  type="button"
                  className="btn btn-secondary btn-cancel"
                  onClick={() => setShow(false)}
                  disabled={actionLoading}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-save"
                  disabled={actionLoading}>
                  {actionLoading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"></span>
                      {editing ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-lg me-1"></i>
                      {editing ? "Update Banner" : "Create Banner"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
