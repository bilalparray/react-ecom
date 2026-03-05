import { useState } from "react";
import { useContactUs } from "../../../hooks/admin/useContactUs";
import { toast } from "react-toastify";
import "./ContactUsList.css";

export default function ContactUsList() {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const {
    items,
    total,
    loading,
    actionLoading,
    error,
    create,
    update,
    remove,
  } = useContactUs(page, pageSize);

  const pages = Math.ceil(total / pageSize);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    description: "",
  });

  /* ---------- Validation ---------- */
  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validate = () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return false;
    }

    if (!form.email.trim()) {
      toast.error("Email is required");
      return false;
    }

    if (!isValidEmail(form.email)) {
      setEmailError("Enter a valid email address");
      toast.error("Enter a valid email address");
      return false;
    }

    if (!form.description.trim()) {
      toast.error("Message is required");
      return false;
    }

    setEmailError(null);
    return true;
  };

  /* ---------- Filter ---------- */
  const filteredItems = items.filter(
    (c) =>
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /* ---------- Modal ---------- */
  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", email: "", description: "" });
    setEmailError(null);
    setShowModal(true);
  };

  const openEdit = (c: any) => {
    setEditing(c);
    setForm({
      name: c.name,
      email: c.email,
      description: c.description,
    });
    setEmailError(null);
    setShowModal(true);
  };

  const save = async () => {
    if (!validate()) return;

    try {
      if (editing) {
        await update(editing.id, form);
        if (!error) {
          toast.success("Contact message updated successfully");
          setShowModal(false);
        }
      } else {
        await create(form);
        if (!error) {
          toast.success("Contact message created successfully");
          setShowModal(false);
        }
      }
    } catch (err) {
      toast.error("An error occurred. Please try again.");
    }
  };

  const deleteRow = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this contact message?")) {
      return;
    }

    try {
      await remove(id);
      if (!error) {
        toast.success("Contact message deleted successfully");
      }
    } catch (err) {
      toast.error("Failed to delete contact message");
    }
  };

  return (
    <div className="contactus-page">
      {/* Page Header */}
      <div className="contactus-header">
        <div>
          <h2 className="contactus-title">Contact Messages</h2>
          <p className="contactus-subtitle">
            Manage customer contact form submissions
          </p>
        </div>
        <div className="contactus-stats">
          <div className="stat-item">
            <span className="stat-label">Total Messages</span>
            <span className="stat-value">{total}</span>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="actions-bar hide">
        <button className="btn btn-primary btn-add" onClick={openCreate}>
          <i className="bi bi-plus-circle-fill me-2"></i>
          Add New Message
        </button>
      </div>

      {/* Search Bar */}
      <div className="search-bar">
        <div className="search-input-wrapper">
          <i className="bi bi-search search-icon"></i>
          <input
            type="text"
            className="search-input"
            placeholder="Search by name, email, or message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="btn-clear-search"
              onClick={() => setSearchQuery("")}>
              <i className="bi bi-x-lg"></i>
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="alert alert-danger alert-custom" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
        </div>
      )}

      {/* Contact Messages Table - Desktop */}
      <div className="contactus-table-card">
        {loading ? (
          <div className="loading-state">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3 text-muted">Loading contact messages...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="empty-state">
            <i className="bi bi-envelope-x empty-icon"></i>
            <h5 className="empty-title">
              {searchQuery ? "No messages found" : "No contact messages yet"}
            </h5>
            <p className="empty-text">
              {searchQuery
                ? "Try adjusting your search query"
                : "Messages will appear here once customers submit the contact form"}
            </p>
            {searchQuery && (
              <button
                className="btn btn-outline-secondary"
                onClick={() => setSearchQuery("")}>
                Clear Search
              </button>
            )}
            {!searchQuery && (
              <button className="btn btn-primary" onClick={openCreate}>
                <i className="bi bi-plus-circle me-1"></i>
                Add Message
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="table-responsive d-none d-md-block">
              <table className="table contactus-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Message</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((c, i) => (
                    <tr key={c.id} className="contactus-row">
                      <td>
                        <div className="contactus-number">
                          {(page - 1) * pageSize + i + 1}
                        </div>
                      </td>
                      <td>
                        <div className="contactus-name">
                          <i className="bi bi-person-circle me-2"></i>
                          {c.name}
                        </div>
                      </td>
                      <td>
                        <div className="contactus-email">
                          <i className="bi bi-envelope me-2"></i>
                          {c.email}
                        </div>
                      </td>
                      <td>
                        <div className="contactus-message">
                          {c.description || (
                            <span className="text-muted">No message</span>
                          )}
                        </div>
                      </td>
                      <td className="text-end">
                        <div className="action-buttons">
                          <button
                            className="btn btn-sm btn-edit hide"
                            onClick={() => openEdit(c)}
                            disabled={actionLoading}>
                            <i className="bi bi-pencil-fill me-1"></i>
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-delete"
                            onClick={() => deleteRow(c.id)}
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
            <div className="contactus-mobile d-md-none">
              {filteredItems.map((c, i) => (
                <div key={c.id} className="contactus-card-mobile">
                  <div className="contactus-card-header">
                    <div className="contactus-card-name">
                      <div className="contactus-name-mobile">
                        <i className="bi bi-person-circle me-2"></i>
                        {c.name}
                      </div>
                      <div className="contactus-number-mobile">
                        #{(page - 1) * pageSize + i + 1}
                      </div>
                    </div>
                  </div>

                  <div className="contactus-card-body">
                    <div className="contactus-info-row">
                      <span className="info-label">
                        <i className="bi bi-envelope me-1"></i>
                        Email
                      </span>
                      <span className="info-value">{c.email}</span>
                    </div>

                    <div className="contactus-info-row">
                      <span className="info-label">
                        <i className="bi bi-chat-left-text me-1"></i>
                        Message
                      </span>
                    </div>
                    <div className="contactus-message-mobile">
                      {c.description || (
                        <span className="text-muted">No message provided</span>
                      )}
                    </div>
                  </div>

                  <div className="contactus-card-footer">
                    <button
                      className="btn btn-outline-primary btn-sm flex-fill me-2"
                      onClick={() => openEdit(c)}
                      disabled={actionLoading}>
                      <i className="bi bi-pencil-fill me-1"></i>
                      Edit
                    </button>
                    <button
                      className="btn btn-outline-danger btn-sm flex-fill"
                      onClick={() => deleteRow(c.id)}
                      disabled={actionLoading}>
                      <i className="bi bi-trash-fill me-1"></i>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {!loading && filteredItems.length > 0 && (
          <div className="pagination-wrapper">
            <div className="pagination-info">
              <span>
                Showing <strong>{(page - 1) * pageSize + 1}</strong> to{" "}
                <strong>
                  {Math.min(page * pageSize, filteredItems.length)}
                </strong>{" "}
                of <strong>{filteredItems.length}</strong> messages
                {searchQuery && " (filtered)"}
              </span>
            </div>

            <div className="pagination-controls">
              <button
                className="btn btn-outline-secondary btn-pagination"
                disabled={page === 1 || loading}
                onClick={() => setPage(page - 1)}>
                <i className="bi bi-chevron-left"></i>
                Previous
              </button>

              <div className="page-numbers">
                {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
                  let pageNum;
                  if (pages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= pages - 2) {
                    pageNum = pages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      className={`btn btn-pagination-number ${pageNum === page
                        ? "btn-primary active"
                        : "btn-outline-secondary"
                        }`}
                      onClick={() => setPage(pageNum)}
                      disabled={loading}>
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                className="btn btn-outline-secondary btn-pagination"
                disabled={page >= pages || loading}
                onClick={() => setPage(page + 1)}>
                Next
                <i className="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => !actionLoading && setShowModal(false)}>
          <div
            className="modal-content-custom"
            onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <h5 className="modal-title-custom">
                <i className="bi bi-envelope-fill me-2"></i>
                {editing ? "Edit Contact Message" : "Create New Contact Message"}
              </h5>
              <button
                className="btn-close-custom"
                onClick={() => !actionLoading && setShowModal(false)}
                disabled={actionLoading}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="modal-body-custom">
              {/* Name */}
              <div className="form-group">
                <label className="form-label-custom">
                  <i className="bi bi-person-fill me-1"></i>
                  Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-control-custom"
                  placeholder="Enter name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  disabled={actionLoading}
                />
              </div>

              {/* Email */}
              <div className="form-group">
                <label className="form-label-custom">
                  <i className="bi bi-envelope-fill me-1"></i>
                  Email Address <span className="required">*</span>
                </label>
                <input
                  type="email"
                  className={`form-control-custom ${emailError ? "is-invalid" : ""
                    }`}
                  placeholder="Enter email address"
                  value={form.email}
                  onChange={(e) => {
                    setForm({ ...form, email: e.target.value });
                    setEmailError(null);
                  }}
                  disabled={actionLoading}
                />
                {emailError && (
                  <div className="form-error-message">
                    <i className="bi bi-exclamation-circle me-1"></i>
                    {emailError}
                  </div>
                )}
              </div>

              {/* Message */}
              <div className="form-group">
                <label className="form-label-custom">
                  <i className="bi bi-chat-left-text-fill me-1"></i>
                  Message <span className="required">*</span>
                </label>
                <textarea
                  className="form-control-custom"
                  placeholder="Enter message"
                  rows={5}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  disabled={actionLoading}
                />
              </div>
            </div>

            <div className="modal-footer-custom">
              <button
                className="btn btn-secondary btn-cancel"
                onClick={() => setShowModal(false)}
                disabled={actionLoading}>
                Cancel
              </button>
              <button
                className="btn btn-primary btn-save"
                onClick={save}
                disabled={
                  actionLoading ||
                  !form.name.trim() ||
                  !form.email.trim() ||
                  !form.description.trim()
                }>
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
                    {editing ? "Update Message" : "Create Message"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
