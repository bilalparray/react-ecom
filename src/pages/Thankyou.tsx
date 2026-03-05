import "./Thankyou.css";

export default function ThankYou() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #1c1e59 0%, #0d0e2e 60%, #0d0e2e 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
      }}>
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          maxWidth: "520px",
          width: "100%",
          padding: "40px",
          textAlign: "center",
          boxShadow: "0 25px 60px rgba(0,0,0,0.35)",
        }}>
        {/* Tick */}
        <div
          style={{
            width: "90px",
            height: "90px",
            borderRadius: "50%",
            background: "#1c1e59",
            margin: "0 auto 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "48px",
            color: "white",
            fontWeight: "bold",
          }}>
          ✓
        </div>

        <h1
          style={{
            fontSize: "28px",
            fontWeight: 700,
            color: "#1c1e59",
            marginBottom: "10px",
          }}>
          Payment Successful
        </h1>

        <p
          style={{
            color: "#475569",
            fontSize: "16px",
            lineHeight: 1.6,
          }}>
          Your order has been placed successfully.
          <br />
          We’re preparing it for dispatch.
        </p>

        {/* Divider */}
        <div
          style={{
            height: "1px",
            background: "#e2e8f0",
            margin: "30px 0",
          }}
        />

        {/* What happens next */}
        <div style={{ textAlign: "left" }}>
          <h3
            style={{
              fontSize: "16px",
              fontWeight: 600,
              marginBottom: "12px",
              color: "#1c1e59",
            }}>
            What happens next
          </h3>

          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              color: "#334155",
              fontSize: "14px",
            }}>
            <li style={{ marginBottom: "10px" }}>✔ Order confirmed</li>
            <li style={{ marginBottom: "10px" }}>✔ Items being packed</li>
            <li style={{ marginBottom: "10px" }}>
              ✔ Shipping updates will be sent
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "30px",
          }}>
          <a
            href="/"
            style={{
              flex: 1,
              textDecoration: "none",
              background: "#1c1e59",
              color: "#ffffff",
              padding: "14px",
              borderRadius: "8px",
              fontWeight: 600,
              textAlign: "center",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#951016"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#1c1e59"}>
            Continue Shopping
          </a>

          <a
            href="/myorders"
            className="thankyou-view-order-btn"
            style={{
              flex: 1,
              textDecoration: "none",
              background: "transparent",
              color: "#1c1e59",
              padding: "14px",
              borderRadius: "8px",
              fontWeight: 600,
              textAlign: "center",
              border: "2px solid #1c1e59",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#1c1e59";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#1c1e59";
            }}>
            View Order
          </a>
        </div>

        <p
          style={{
            marginTop: "30px",
            fontSize: "12px",
            color: "#64748b",
          }}>
          If you need help, our support team is available 24/7.
        </p>
      </div>
    </div>
  );
}
