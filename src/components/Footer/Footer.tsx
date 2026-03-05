import { Link } from "react-router-dom";
import "./Footer.css";
export function Footer() {
  return (
    <footer
      style={{
        background: "#0f1418",
        color: "#E5E7EB",
      }}
      className="pt-5 mt-5">
      {/* Top CTA bar */}
      <div className="container pb-4 border-bottom border-secondary">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
          <div>
            <h4 className="fw-bold mb-1">Alpine Saffron</h4>
            <p className="text-secondary mb-0">
              The one stop shop for all your Healthy Foods
            </p>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container py-5">
        <div className="row g-4">
          {/* Quick Links */}
          <div className="col-md-4">
            <h5 className="mb-3">Quick Links</h5>
            <ul className="list-unstyled d-flex flex-column gap-2 text-secondary">
              <li>
                <Link to="/" className="footer-link">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/about" className="footer-link">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="footer-link">
                  Contact Us
                </Link>
              </li>
            </ul>

            <div className="mt-4">
              <h6>Follow Us</h6>
              <div className="d-flex gap-3 fs-5">
                <a
                  target="_blank"
                  href="https://www.facebook.com/people/Alpine-Saffron/61579678294409/#">
                  <i className="bi bi-facebook"></i>
                </a>
                <a
                  target="_blank"
                  href="https://www.instagram.com/alpine_saffron24/">
                  {" "}
                  <i className="bi bi-instagram"></i>
                </a>
                <a
                  target="_blank"
                  href="https://www.youtube.com/watch?v=4lexVluSDGs">
                  {" "}
                  <i className="bi bi-youtube"></i>
                </a>
              </div>
            </div>
          </div>

          {/* Policies */}
          <div className="col-md-4">
            <h5 className="mb-3">Company Policy</h5>
            <ul className="list-unstyled d-flex flex-column gap-2 text-secondary">
              <li>
                <Link to="/terms" className="footer-link">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="footer-link">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/refund-policy" className="footer-link">
                  Return & Exchange Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Store Info */}
          <div className="col-md-4">
            <h5 className="mb-3">Store Info</h5>

            <div className="d-flex gap-3 mb-3">
              <i className="bi bi-geo-alt fs-5" style={{ color: "white" }}></i>
              <span className="text-secondary">
                10, Nh44, Near J&K Bank, Barsoo, Jammu and Kashmir, 192122
              </span>
            </div>

            <div className="d-flex gap-3 mb-3">
              <i className="bi bi-envelope fs-5" style={{ color: "white" }}></i>
              <span className="text-secondary">alpinesaffron24@gmail.com</span>
            </div>

            <div className="d-flex gap-3">
              <i
                className="bi bi-telephone fs-5"
                style={{ color: "white" }}></i>
              <span className="text-secondary">
                +91 9541560938 +917051476537
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="py-3 text-center text-secondary"
        style={{
          background: "#0a0f13",
          borderTop: "1px solid rgba(255,255,255,0.1)",
        }}>
        Designed & Developed by{" "}
        <span>
          <a href="https://www.siffrum.com/" target="_blank">
            {" "}
            Siffrum Analytics Pvt Ltd
          </a>
        </span>{" "}
        © 2025 Alpine. All rights reserved.
      </div>
    </footer>
  );
}
