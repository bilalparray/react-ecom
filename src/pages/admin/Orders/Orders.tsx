import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchOrders,
  fetchCustomers,
  updateStatus,
} from "../../../services/admin/orders.service";
import {
  exportToPDF,
  exportToExcel,
  formatCurrencyForExport,
  formatDateForExport,
} from "../../../utils/exportUtils";
import type { ExportColumn } from "../../../utils/exportUtils";
import "./Orders.css";

const STATUS_COLORS: Record<string, string> = {
  created: "status-created",
  paid: "status-paid",
  shipped: "status-shipped",
  delivered: "status-delivered",
  failed: "status-failed",
  cancelled: "status-cancelled",
};

const STATUS_LABELS: Record<string, string> = {
  created: "Created",
  paid: "Paid",
  shipped: "Shipped",
  delivered: "Delivered",
  failed: "Failed",
  cancelled: "Cancelled",
};

export default function OrdersPage() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [filters, setFilters] = useState({
    status: "",
    customerName: "",
    startDate: "",
    endDate: "",
    search: "",
    minAmount: "",
    maxAmount: "",
  });

  const load = async () => {
    try {
      setLoading(true);

      const res = await fetchOrders({
        page,
        pageSize,
        ...filters,
        minAmount: filters.minAmount ? Number(filters.minAmount) : undefined,
        maxAmount: filters.maxAmount ? Number(filters.maxAmount) : undefined,
      });

      // Check and auto-update order status based on payment status
      const updatedOrders = res.orders.map((order: any) => {
        // If order has payment and payment status is "captured", but order status is not "paid"
        if (order.payments && order.payments.length > 0) {
          const latestPayment = order.payments[0];
          if (latestPayment.status === "captured" && order.status !== "paid" && order.status !== "flagged") {
            // Auto-update order status to paid
            updateStatus(order.id, "paid").catch((err) => {
              console.error(`Failed to auto-update order ${order.id} status:`, err);
            });
            return { ...order, status: "paid" };
          }
        }
        return order;
      });

      setOrders(updatedOrders);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers().then((r) => setCustomers(r.successData.data));
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters]);

  // Auto-refresh orders every 30 seconds to check for status updates
  useEffect(() => {
    const interval = setInterval(() => {
      load();
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters]);

  const applyFilters = () => {
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      status: "",
      customerName: "",
      startDate: "",
      endDate: "",
      search: "",
      minAmount: "",
      maxAmount: "",
    });
    setPage(1);
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  const pages = Math.ceil(total / pageSize);

  const getStatusBadgeClass = (status: string) => {
    return `status-badge ${STATUS_COLORS[status] || "status-default"}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleExportPDF = () => {
    const exportData = orders.map((order) => ({
      orderId: `#${order.id}`,
      receipt: order.receipt || "N/A",
      customer: `${order.customer?.firstName || ""} ${order.customer?.lastName || ""}`.trim() || "N/A",
      email: order.customer?.email || "N/A",
      date: formatDateForExport(order.createdAt),
      amount: formatCurrencyForExport(order.amount),
      status: STATUS_LABELS[order.status] || order.status,
    }));

    const columns: ExportColumn[] = [
      { key: "orderId", label: "Order ID" },
      { key: "receipt", label: "Receipt" },
      { key: "customer", label: "Customer" },
      { key: "email", label: "Email" },
      { key: "date", label: "Date" },
      { key: "amount", label: "Amount" },
      { key: "status", label: "Status" },
    ];

    exportToPDF(exportData, columns, `orders-${new Date().toISOString().split("T")[0]}`, "Orders List");
  };

  const handleExportExcel = () => {
    const exportData = orders.map((order) => ({
      orderId: `#${order.id}`,
      receipt: order.receipt || "N/A",
      customer: `${order.customer?.firstName || ""} ${order.customer?.lastName || ""}`.trim() || "N/A",
      email: order.customer?.email || "N/A",
      date: formatDateForExport(order.createdAt),
      amount: formatCurrencyForExport(order.amount),
      status: STATUS_LABELS[order.status] || order.status,
    }));

    const columns: ExportColumn[] = [
      { key: "orderId", label: "Order ID" },
      { key: "receipt", label: "Receipt" },
      { key: "customer", label: "Customer" },
      { key: "email", label: "Email" },
      { key: "date", label: "Date" },
      { key: "amount", label: "Amount" },
      { key: "status", label: "Status" },
    ];

    exportToExcel(exportData, columns, `orders-${new Date().toISOString().split("T")[0]}`, "Orders");
  };

  return (
    <div className="orders-page">
      {/* Page Header */}
      <div className="orders-header">
        <div>
          <h2 className="orders-title">Orders Management</h2>
          <p className="orders-subtitle">
            Manage and track all customer orders
          </p>
        </div>
        <div className="orders-header-right">
          <div className="orders-stats">
            <div className="stat-item">
              <span className="stat-label">Total Orders</span>
              <span className="stat-value">{total}</span>
            </div>
          </div>
          <div className="export-buttons">
            <button
              className="btn btn-outline-danger btn-export"
              onClick={handleExportPDF}
              disabled={loading || orders.length === 0}
              title="Export to PDF">
              <i className="bi bi-file-pdf me-2"></i>
              Export PDF
            </button>
            <button
              className="btn btn-outline-success btn-export"
              onClick={handleExportExcel}
              disabled={loading || orders.length === 0}
              title="Export to Excel">
              <i className="bi bi-file-excel me-2"></i>
              Export Excel
            </button>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-card">
        <div
          className="filters-header"
          onClick={() => setFiltersExpanded(!filtersExpanded)}>
          <div className="filters-title-wrapper">
            <i className="bi bi-funnel-fill me-2"></i>
            <span className="filters-title">Filters</span>
            {hasActiveFilters && (
              <span className="active-filters-badge">
                {Object.values(filters).filter((v) => v !== "").length}
              </span>
            )}
          </div>
          <div className="filters-actions">
            {hasActiveFilters && (
              <button
                className="btn-clear-filters"
                onClick={(e) => {
                  e.stopPropagation();
                  clearFilters();
                }}>
                <i className="bi bi-x-circle me-1"></i>
                Clear All
              </button>
            )}
            <i
              className={`bi bi-chevron-${filtersExpanded ? "up" : "down"} filters-toggle`}></i>
          </div>
        </div>

        {filtersExpanded && (
          <div className="filters-content">
            <div className="filters-grid">
              <div className="filter-group">
                <label className="filter-label">
                  <i className="bi bi-search me-1"></i>
                  Search
                </label>
                <input
                  type="text"
                  className="form-control filter-input"
                  placeholder="Order ID, receipt number..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                />
              </div>

              <div className="filter-group">
                <label className="filter-label">
                  <i className="bi bi-tag-fill me-1"></i>
                  Status
                </label>
                <select
                  className="form-select filter-input"
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value })
                  }>
                  <option value="">All Status</option>
                  <option value="created">Created</option>
                  <option value="paid">Paid</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">
                  <i className="bi bi-person-fill me-1"></i>
                  Customer
                </label>
                <select
                  className="form-select filter-input"
                  value={
                    customers.find(
                      (c) =>
                        `${c.firstName} ${c.lastName}` === filters.customerName
                    )?.id || ""
                  }
                  onChange={(e) => {
                    const c = customers.find(
                      (x) => x.id === Number(e.target.value)
                    );
                    setFilters({
                      ...filters,
                      customerName: c
                        ? `${c.firstName} ${c.lastName}`
                        : "",
                    });
                  }}>
                  <option value="">All Customers</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">
                  <i className="bi bi-calendar-event me-1"></i>
                  Start Date
                </label>
                <input
                  type="date"
                  className="form-control filter-input"
                  value={filters.startDate}
                  onChange={(e) =>
                    setFilters({ ...filters, startDate: e.target.value })
                  }
                />
              </div>

              <div className="filter-group">
                <label className="filter-label">
                  <i className="bi bi-calendar-check me-1"></i>
                  End Date
                </label>
                <input
                  type="date"
                  className="form-control filter-input"
                  value={filters.endDate}
                  onChange={(e) =>
                    setFilters({ ...filters, endDate: e.target.value })
                  }
                />
              </div>

              <div className="filter-group">
                <label className="filter-label">
                  <i className="bi bi-currency-rupee me-1"></i>
                  Min Amount
                </label>
                <input
                  type="number"
                  className="form-control filter-input"
                  placeholder="₹0"
                  value={filters.minAmount}
                  onChange={(e) =>
                    setFilters({ ...filters, minAmount: e.target.value })
                  }
                />
              </div>

              <div className="filter-group">
                <label className="filter-label">
                  <i className="bi bi-currency-rupee me-1"></i>
                  Max Amount
                </label>
                <input
                  type="number"
                  className="form-control filter-input"
                  placeholder="₹0"
                  value={filters.maxAmount}
                  onChange={(e) =>
                    setFilters({ ...filters, maxAmount: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="filters-footer">
              <button
                className="btn btn-secondary btn-cancel"
                onClick={clearFilters}>
                <i className="bi bi-x-lg me-1"></i>
                Reset
              </button>
              <button
                className="btn btn-primary btn-apply"
                disabled={loading}
                onClick={applyFilters}>
                {loading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"></span>
                    Applying...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-lg me-1"></i>
                    Apply Filters
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Orders Table - Desktop */}
      <div className="orders-table-card">
        {loading ? (
          <div className="loading-state">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3 text-muted">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <i className="bi bi-inbox empty-icon"></i>
            <h5 className="empty-title">No orders found</h5>
            <p className="empty-text">
              {hasActiveFilters
                ? "Try adjusting your filters to see more results"
                : "No orders have been placed yet"}
            </p>
            {hasActiveFilters && (
              <button className="btn btn-outline-primary" onClick={clearFilters}>
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="table-responsive d-none d-md-block">
              <table className="table orders-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="order-row">
                      <td>
                        <div className="order-id">
                          <i className="bi bi-hash me-1"></i>
                          <strong>#{o.id}</strong>
                        </div>
                        {o.receipt && (
                          <small className="text-muted d-block mt-1">
                            Receipt: {o.receipt}
                          </small>
                        )}
                      </td>
                      <td>
                        <div className="customer-info">
                          <div className="customer-name">
                            {o.customer?.firstName || "N/A"}{" "}
                            {o.customer?.lastName || ""}
                          </div>
                          {o.customer?.email && (
                            <small className="text-muted d-block">
                              {o.customer.email}
                            </small>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="order-date">
                          {o.createdAt
                            ? formatDate(o.createdAt)
                            : formatDate(new Date().toISOString())}
                        </div>
                      </td>
                      <td>
                        <div className="order-amount">
                          {formatCurrency(o.amount)}
                        </div>
                      </td>
                      <td>
                        <div className="status-container">
                          <select
                            className={`form-select form-select-sm status-select ${getStatusBadgeClass(
                              o.status
                            )}`}
                            value={o.status}
                            onChange={(e) =>
                              updateStatus(o.id, e.target.value).then(load)
                            }>
                            <option value="created">Created</option>
                            <option value="paid">Paid</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="failed">Failed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          <span
                            className={`status-badge-display ${getStatusBadgeClass(
                              o.status
                            )}`}>
                            {STATUS_LABELS[o.status] || o.status}
                          </span>
                        </div>
                      </td>
                      <td className="text-end">
                        <button
                          className="btn btn-sm btn-view"
                          onClick={() => navigate(`/orders/${o.id}`)}>
                          <i className="bi bi-eye me-1"></i>
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="orders-mobile d-md-none">
              {orders.map((o) => (
                <div key={o.id} className="order-card-mobile">
                  <div className="order-card-header">
                    <div>
                      <div className="order-id-mobile">
                        <i className="bi bi-hash me-1"></i>
                        <strong>#{o.id}</strong>
                      </div>
                      {o.receipt && (
                        <small className="text-muted d-block">
                          Receipt: {o.receipt}
                        </small>
                      )}
                    </div>
                    <span
                      className={`status-badge-mobile ${getStatusBadgeClass(
                        o.status
                      )}`}>
                      {STATUS_LABELS[o.status] || o.status}
                    </span>
                  </div>

                  <div className="order-card-body">
                    <div className="order-info-row">
                      <span className="info-label">
                        <i className="bi bi-person me-1"></i>
                        Customer
                      </span>
                      <span className="info-value">
                        {o.customer?.firstName || "N/A"}{" "}
                        {o.customer?.lastName || ""}
                      </span>
                    </div>

                    {o.customer?.email && (
                      <div className="order-info-row">
                        <span className="info-label">Email</span>
                        <span className="info-value text-muted small">
                          {o.customer.email}
                        </span>
                      </div>
                    )}

                    <div className="order-info-row">
                      <span className="info-label">
                        <i className="bi bi-calendar me-1"></i>
                        Date
                      </span>
                      <span className="info-value">
                        {o.createdAt
                          ? formatDate(o.createdAt)
                          : formatDate(new Date().toISOString())}
                      </span>
                    </div>

                    <div className="order-info-row">
                      <span className="info-label">
                        <i className="bi bi-currency-rupee me-1"></i>
                        Amount
                      </span>
                      <span className="info-value amount-mobile">
                        {formatCurrency(o.amount)}
                      </span>
                    </div>

                    <div className="order-info-row">
                      <span className="info-label">Status</span>
                      <select
                        className={`form-select form-select-sm status-select-mobile ${getStatusBadgeClass(
                          o.status
                        )}`}
                        value={o.status}
                        onChange={(e) =>
                          updateStatus(o.id, e.target.value).then(load)
                        }>
                        <option value="created">Created</option>
                        <option value="paid">Paid</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="failed">Failed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  <div className="order-card-footer">
                    <button
                      className="btn btn-primary btn-sm w-100"
                      onClick={() => navigate(`/orders/${o.id}`)}>
                      <i className="bi bi-eye me-1"></i>
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {!loading && orders.length > 0 && (
          <div className="pagination-wrapper">
            <div className="pagination-info">
              <span>
                Showing <strong>{(page - 1) * pageSize + 1}</strong> to{" "}
                <strong>{Math.min(page * pageSize, total)}</strong> of{" "}
                <strong>{total}</strong> orders
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
                disabled={page >= pages || loading}
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
