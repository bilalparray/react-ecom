import { useEffect, useState } from "react";
import {
  fetchCustomers,
  removeCustomer,
} from "../../../services/admin/customers.service";
import { toast } from "react-toastify";
import {
  exportToPDF,
  exportToExcel,
} from "../../../utils/exportUtils";
import type { ExportColumn } from "../../../utils/exportUtils";
import "./CustomersPage.css";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchCustomers({
        skip: (page - 1) * pageSize,
        top: pageSize,
        search: search || undefined,
      });
      setCustomers(res.data);
      setTotal(res.total);
      setHasMore(res.hasMore);
    } catch (error) {
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  const deleteRow = async (id: number) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this customer? This action cannot be undone."
      )
    ) {
      return;
    }

    setActionLoading(true);
    try {
      await removeCustomer(id);
      toast.success("Customer deleted successfully");
      setPage(1);
      load();
    } catch (error) {
      toast.error("Failed to delete customer");
    } finally {
      setActionLoading(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    const first = firstName?.charAt(0)?.toUpperCase() || "";
    const last = lastName?.charAt(0)?.toUpperCase() || "";
    return first + last || "?";
  };

  const formatPhone = (phone: string) => {
    if (!phone) return "N/A";
    // Simple formatting - you can enhance this
    return phone;
  };

  const handleExportPDF = () => {
    const exportData = customers.map((customer) => ({
      name: `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "N/A",
      email: customer.email || "N/A",
      phone: formatPhone(customer.contact),
      address: customer.addresses && customer.addresses.length > 0
        ? `${customer.addresses[0].addressLine1 || ""}, ${customer.addresses[0].city || ""}, ${customer.addresses[0].state || ""}`.replace(/^,\s*|,\s*$/g, "") || "N/A"
        : "N/A",
      totalAddresses: customer.addresses?.length || 0,
    }));

    const columns: ExportColumn[] = [
      { key: "name", label: "Customer Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "address", label: "Primary Address" },
      { key: "totalAddresses", label: "Total Addresses" },
    ];

    exportToPDF(exportData, columns, `customers-${new Date().toISOString().split("T")[0]}`, "Customers List");
  };

  const handleExportExcel = () => {
    const exportData = customers.map((customer) => ({
      name: `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "N/A",
      email: customer.email || "N/A",
      phone: formatPhone(customer.contact),
      address: customer.addresses && customer.addresses.length > 0
        ? `${customer.addresses[0].addressLine1 || ""}, ${customer.addresses[0].city || ""}, ${customer.addresses[0].state || ""}`.replace(/^,\s*|,\s*$/g, "") || "N/A"
        : "N/A",
      totalAddresses: customer.addresses?.length || 0,
    }));

    const columns: ExportColumn[] = [
      { key: "name", label: "Customer Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "address", label: "Primary Address" },
      { key: "totalAddresses", label: "Total Addresses" },
    ];

    exportToExcel(exportData, columns, `customers-${new Date().toISOString().split("T")[0]}`, "Customers");
  };

  const pages = Math.ceil(total / pageSize);

  return (
    <div className="customers-page">
      {/* Page Header */}
      <div className="customers-header">
        <div>
          <h2 className="customers-title">Customers Management</h2>
          <p className="customers-subtitle">
            View and manage all your customers
          </p>
        </div>
        <div className="customers-header-right">
          <div className="customers-stats">
            <div className="stat-item">
              <span className="stat-label">Total Customers</span>
              <span className="stat-value">{total}</span>
            </div>
          </div>
          <div className="export-buttons">
            <button
              className="btn btn-outline-danger btn-export"
              onClick={handleExportPDF}
              disabled={loading || customers.length === 0}
              title="Export to PDF">
              <i className="bi bi-file-pdf me-2"></i>
              Export PDF
            </button>
            <button
              className="btn btn-outline-success btn-export"
              onClick={handleExportExcel}
              disabled={loading || customers.length === 0}
              title="Export to Excel">
              <i className="bi bi-file-excel me-2"></i>
              Export Excel
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-bar-card">
        <div className="search-wrapper">
          <i className="bi bi-search search-icon"></i>
          <input
            type="text"
            className="search-input"
            placeholder="Search by name, email, or phone number..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          {search && (
            <button
              className="btn-clear-search"
              onClick={() => {
                setSearch("");
                setPage(1);
              }}>
              <i className="bi bi-x-lg"></i>
            </button>
          )}
        </div>
      </div>

      {/* Customers Table - Desktop */}
      <div className="customers-table-card">
        {loading ? (
          <div className="loading-state">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3 text-muted">Loading customers...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="empty-state">
            <i className="bi bi-people empty-icon"></i>
            <h5 className="empty-title">
              {search ? "No customers found" : "No customers yet"}
            </h5>
            <p className="empty-text">
              {search
                ? "Try adjusting your search terms"
                : "Customers will appear here once they register"}
            </p>
            {search && (
              <button
                className="btn btn-outline-primary"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}>
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="table-responsive d-none d-md-block">
              <table className="table customers-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Contact</th>
                    <th>Addresses</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} className="customer-row">
                      <td>
                        <div className="customer-info">
                          <div className="customer-avatar">
                            {getInitials(c.firstName || "", c.lastName || "")}
                          </div>
                          <div className="customer-details">
                            <div className="customer-name">
                              {c.firstName || ""} {c.lastName || ""}
                            </div>
                            <div className="customer-email">{c.email || "N/A"}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="contact-info">
                          <div className="contact-item">
                            <i className="bi bi-envelope me-2"></i>
                            <span>{c.email || "N/A"}</span>
                          </div>
                          <div className="contact-item">
                            <i className="bi bi-telephone me-2"></i>
                            <span>{formatPhone(c.contact)}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="addresses-list">
                          {c.addresses && c.addresses.length > 0 ? (
                            c.addresses.slice(0, 2).map((a: any, i: number) => (
                              <div key={i} className="address-item">
                                <i className="bi bi-geo-alt-fill me-2"></i>
                                <span>
                                  {a.addressLine1}, {a.city}, {a.state}
                                </span>
                              </div>
                            ))
                          ) : (
                            <span className="text-muted">No addresses</span>
                          )}
                          {c.addresses && c.addresses.length > 2 && (
                            <div className="address-more">
                              +{c.addresses.length - 2} more
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="text-end">
                        <button
                          className="btn btn-sm btn-delete"
                          onClick={() => deleteRow(c.id)}
                          disabled={actionLoading}>
                          <i className="bi bi-trash-fill me-1"></i>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="customers-mobile d-md-none">
              {customers.map((c) => (
                <div key={c.id} className="customer-card-mobile">
                  <div className="customer-card-header">
                    <div className="customer-info-mobile">
                      <div className="customer-avatar-mobile">
                        {getInitials(c.firstName || "", c.lastName || "")}
                      </div>
                      <div>
                        <div className="customer-name-mobile">
                          {c.firstName || ""} {c.lastName || ""}
                        </div>
                        <div className="customer-email-mobile">{c.email || "N/A"}</div>
                      </div>
                    </div>
                  </div>

                  <div className="customer-card-body">
                    <div className="customer-info-row">
                      <span className="info-label">
                        <i className="bi bi-envelope me-1"></i>
                        Email
                      </span>
                      <span className="info-value">{c.email || "N/A"}</span>
                    </div>

                    <div className="customer-info-row">
                      <span className="info-label">
                        <i className="bi bi-telephone me-1"></i>
                        Phone
                      </span>
                      <span className="info-value">{formatPhone(c.contact)}</span>
                    </div>

                    {c.addresses && c.addresses.length > 0 && (
                      <div className="customer-info-row">
                        <span className="info-label">
                          <i className="bi bi-geo-alt-fill me-1"></i>
                          Addresses
                        </span>
                        <div className="addresses-list-mobile">
                          {c.addresses.slice(0, 2).map((a: any, i: number) => (
                            <div key={i} className="address-item-mobile">
                              {a.addressLine1}, {a.city}, {a.state}
                            </div>
                          ))}
                          {c.addresses.length > 2 && (
                            <div className="address-more-mobile">
                              +{c.addresses.length - 2} more addresses
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="customer-card-footer">
                    <button
                      className="btn btn-outline-danger btn-sm w-100"
                      onClick={() => deleteRow(c.id)}
                      disabled={actionLoading}>
                      <i className="bi bi-trash-fill me-1"></i>
                      Delete Customer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {!loading && customers.length > 0 && (
          <div className="pagination-wrapper">
            <div className="pagination-info">
              <span>
                Showing <strong>{(page - 1) * pageSize + 1}</strong> to{" "}
                <strong>{Math.min(page * pageSize, total)}</strong> of{" "}
                <strong>{total}</strong> customers
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
                      className={`btn btn-pagination-number ${
                        pageNum === page
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
                disabled={!hasMore || loading}
                onClick={() => setPage(page + 1)}>
                Next
                <i className="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
