import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchOrderById,
  updateStatus,
} from "../../../services/admin/orders.service";
import { toast } from "react-toastify";
import "./OrderDetailsPage.css";

export default function OrderDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchOrderById(Number(id));
      if (res && res.successData) {
        setOrder(res.successData);
      } else {
        setError("Order not found");
      }
    } catch (err) {
      setError("Failed to load order");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Auto-refresh order every 30 seconds to check for status updates
  useEffect(() => {
    if (!id) return;
    
    const interval = setInterval(() => {
      load();
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return;
    setUpdating(true);
    try {
      await updateStatus(order.id, newStatus);
      toast.success("Order status updated successfully");
      await load();
    } catch (err) {
      toast.error("Failed to update order status");
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "created":
        return "status-created";
      case "paid":
        return "status-paid";
      case "shipped":
        return "status-shipped";
      case "delivered":
        return "status-delivered";
      case "failed":
        return "status-failed";
      case "cancelled":
        return "status-cancelled";
      default:
        return "status-default";
    }
  };

  if (loading) {
    return (
      <div className="order-details-loading">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3 text-muted">Loading order details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="order-details-error">
        <div className="error-content">
          <i className="bi bi-exclamation-triangle-fill error-icon"></i>
          <h5 className="error-title">Order Not Found</h5>
          <p className="error-text">
            {error || "Order data is corrupted or unavailable"}
          </p>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/orders")}>
            <i className="bi bi-arrow-left me-2"></i>
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  const customer = order.customer;
  const address = customer?.addresses?.[0];

  return (
    <div className="order-details-page">
      {/* Action Bar */}
      <div className="order-details-actions-bar">
        <button
          className="btn btn-outline-secondary btn-back"
          onClick={() => navigate("/orders")}>
          <i className="bi bi-arrow-left me-2"></i>
          Back to Orders
        </button>
        <div className="action-buttons-group">
          <button
            className="btn btn-outline-primary btn-action"
            onClick={() => navigate(`/invoices/${order.id}`)}>
            <i className="bi bi-receipt me-2"></i>
            View Invoice
          </button>
        </div>
      </div>

      {/* Order Header */}
      <div className="order-details-header">
        <div className="order-header-content">
          <div>
            <h2 className="order-title">Order Details</h2>
            <p className="order-subtitle">Order #{order.id}</p>
          </div>
          <div className="order-status-badge-wrapper">
            <span className={`order-status-badge ${getStatusClass(order.status)}`}>
              <i className={`bi ${
                order.status === "delivered" ? "bi-check-circle-fill" :
                order.status === "shipped" ? "bi-truck" :
                order.status === "paid" ? "bi-credit-card-fill" :
                order.status === "failed" ? "bi-x-circle-fill" :
                order.status === "cancelled" ? "bi-x-octagon-fill" :
                "bi-clock-fill"
              } me-2`}></i>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Order Info Cards */}
      <div className="order-info-grid">
        {/* Order Summary Card */}
        <div className="order-info-card">
          <div className="order-card-header">
            <i className="bi bi-receipt-cutoff me-2"></i>
            <h5 className="order-card-title">Order Summary</h5>
          </div>
          <div className="order-card-body">
            <div className="order-info-row">
              <span className="info-label">
                <i className="bi bi-hash me-1"></i>
                Order ID
              </span>
              <span className="info-value">#{order.id}</span>
            </div>
            {order.razorpayOrderId && (
              <div className="order-info-row">
                <span className="info-label">
                  <i className="bi bi-credit-card me-1"></i>
                  Razorpay Order ID
                </span>
                <span className="info-value small-text">{order.razorpayOrderId}</span>
              </div>
            )}
            {order.receipt && (
              <div className="order-info-row">
                <span className="info-label">
                  <i className="bi bi-receipt me-1"></i>
                  Receipt Number
                </span>
                <span className="info-value">{order.receipt}</span>
              </div>
            )}
            <div className="order-info-row">
              <span className="info-label">
                <i className="bi bi-calendar me-1"></i>
                Order Date
              </span>
              <span className="info-value">
                {order.createdAt ? formatDate(order.createdAt) : "N/A"}
              </span>
            </div>
            <div className="order-divider"></div>
            <div className="order-info-row">
              <span className="info-label">
                <i className="bi bi-currency-rupee me-1"></i>
                Total Amount
              </span>
              <span className="info-value amount-total">
                {formatCurrency(order.amount)}
              </span>
            </div>
            <div className="order-info-row">
              <span className="info-label">
                <i className="bi bi-check-circle me-1"></i>
                Paid Amount
              </span>
              <span className="info-value amount-paid">
                {formatCurrency(order.paid_amount)}
              </span>
            </div>
            <div className="order-info-row">
              <span className="info-label">
                <i className="bi bi-exclamation-circle me-1"></i>
                Due Amount
              </span>
              <span className="info-value amount-due">
                {formatCurrency(order.due_amount)}
              </span>
            </div>
          </div>
        </div>

        {/* Customer Card */}
        <div className="order-info-card">
          <div className="order-card-header">
            <i className="bi bi-person me-2"></i>
            <h5 className="order-card-title">Customer Information</h5>
          </div>
          <div className="order-card-body">
            <div className="order-info-row">
              <span className="info-label">
                <i className="bi bi-person-circle me-1"></i>
                Name
              </span>
              <span className="info-value">
                {customer?.firstName} {customer?.lastName}
              </span>
            </div>
            <div className="order-info-row">
              <span className="info-label">
                <i className="bi bi-envelope me-1"></i>
                Email
              </span>
              <span className="info-value">{customer?.email}</span>
            </div>
            {customer?.contact && (
              <div className="order-info-row">
                <span className="info-label">
                  <i className="bi bi-telephone me-1"></i>
                  Contact
                </span>
                <span className="info-value">{customer.contact}</span>
              </div>
            )}
            {address && (
              <>
                <div className="order-divider"></div>
                <div className="order-info-section">
                  <span className="info-label">
                    <i className="bi bi-geo-alt me-1"></i>
                    Shipping Address
                  </span>
                  <div className="address-block">
                    <div>{address.addressLine1}</div>
                    {address.addressLine2 && <div>{address.addressLine2}</div>}
                    <div>
                      {address.city}, {address.state} {address.postalCode}
                    </div>
                    <div>{address.country}</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Payment Card */}
        <div className="order-info-card">
          <div className="order-card-header">
            <i className="bi bi-credit-card me-2"></i>
            <h5 className="order-card-title">Payment Information</h5>
          </div>
          <div className="order-card-body">
            {order.paymentId && (
              <div className="order-info-row">
                <span className="info-label">
                  <i className="bi bi-receipt me-1"></i>
                  Payment ID
                </span>
                <span className="info-value small-text">{order.paymentId}</span>
              </div>
            )}
            {order.signature && (
              <div className="order-info-row">
                <span className="info-label">
                  <i className="bi bi-shield-check me-1"></i>
                  Signature
                </span>
                <span className="info-value small-text signature-text">
                  {order.signature}
                </span>
              </div>
            )}
            <div className="order-divider"></div>
            <div className="order-info-section">
              <label className="status-label">
                <i className="bi bi-toggles me-1"></i>
                Order Status
              </label>
              <select
                className="status-select"
                value={order.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={updating}>
                <option value="created">Created</option>
                <option value="paid">Paid</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              {updating && (
                <div className="status-updating">
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Updating...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="order-items-card">
        <div className="order-items-header">
          <h5 className="order-items-title">
            <i className="bi bi-cart me-2"></i>
            Order Items
          </h5>
          <span className="order-items-count">
            {order.items?.length || 0} item(s)
          </span>
        </div>
        <div className="order-items-table-wrapper">
          {!order.items || order.items.length === 0 ? (
            <div className="order-items-empty">
              <i className="bi bi-cart-x"></i>
              <p>No items in this order</p>
            </div>
          ) : (
            <table className="order-items-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Variant</th>
                  <th className="text-center">Quantity</th>
                  <th className="text-end">Unit Price</th>
                  <th className="text-end">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item: any) => (
                  <tr key={item.id}>
                    <td>
                      <div className="product-name">{item.product?.name || "N/A"}</div>
                    </td>
                    <td>
                      <div className="variant-info">
                        <span className="variant-sku">{item.variant?.sku || "N/A"}</span>
                        {item.variant?.unitName && (
                          <span className="variant-unit">({item.variant.unitName})</span>
                        )}
                      </div>
                    </td>
                    <td className="text-center">
                      <span className="quantity-badge">{item.quantity}</span>
                    </td>
                    <td className="text-end">
                      <span className="price-text">
                        {formatCurrency(item.price)}
                      </span>
                    </td>
                    <td className="text-end">
                      <span className="total-text">
                        {formatCurrency(item.total)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="order-total-row">
                  <td colSpan={4} className="text-end">
                    <strong>Order Total:</strong>
                  </td>
                  <td className="text-end">
                    <strong className="order-grand-total">
                      {formatCurrency(order.amount)}
                    </strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
