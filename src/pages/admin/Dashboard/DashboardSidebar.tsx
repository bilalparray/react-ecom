import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import "./DashboardSidebar.css";
import { clearToken } from "../../../auth/tokenManager";

interface MenuItem {
  path: string;
  label: string;
  icon: string;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const menuSections: MenuSection[] = [
  {
    title: "Dashboard",
    items: [
      { path: "/dashboard", label: "Dashboard", icon: "bi-speedometer2" },
    ],
  },
  {
    title: "Sales & Orders",
    items: [
      { path: "/orders", label: "Orders", icon: "bi-bag-check" },
      { path: "/invoices", label: "Invoices", icon: "bi-receipt" },
      { path: "/customers", label: "Customers", icon: "bi-people" },
    ],
  },
  {
    title: "Products",
    items: [
      { path: "/products", label: "Products", icon: "bi-box-seam" },
      { path: "/categories", label: "Categories", icon: "bi-grid" },
      { path: "/units", label: "Units", icon: "bi-rulers" },
    ],
  },
  {
    title: "Website Resources",
    items: [
      { path: "/banners", label: "Banners", icon: "bi-image" },
      { path: "/testimonials", label: "Testimonials", icon: "bi-chat-quote" },
      { path: "/videos", label: "Videos", icon: "bi-play-circle" },
    ],
  },
  {
    title: "Other",
    items: [
      { path: "/reviews", label: "Reviews", icon: "bi-star" },
      { path: "/contactus", label: "Contact Us", icon: "bi-envelope" },
    ],
  },
];

export default function DashboardSidebar() {
  const [toggled, setToggled] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const closeOnMobile = () => {
    if (window.innerWidth < 768) {
      setToggled(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    navigate("/auth/login", { replace: true });
  };

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {toggled && (
        <div className="sidebar-overlay" onClick={() => setToggled(false)} />
      )}

      {/* Mobile Top Bar */}
      <div className="mobile-top-bar">
        <button
          className="mobile-menu-btn"
          onClick={() => setToggled(!toggled)}
          aria-label="Toggle menu">
          <i className={`bi ${toggled ? "bi-x-lg" : "bi-list"}`}></i>
        </button>
        <div className="mobile-brand">
          <img src="/alpine.png" alt="Alpine" />
          <span>Alpine</span>
        </div>
        <button className="mobile-logout-btn" onClick={handleLogout}>
          <i className="bi bi-box-arrow-right"></i>
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`admin-sidebar ${toggled ? "open" : ""}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <img src="/alpine.png" alt="Alpine" />
          <span className="brand-name">Alpine</span>
          <button
            className="sidebar-close-btn"
            onClick={() => setToggled(false)}
            aria-label="Close sidebar">
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {menuSections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="nav-section">
              <div className="nav-section-title">{section.title}</div>
              <div className="nav-items">
                {section.items.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={`nav-item ${active ? "active" : ""}`}
                      onClick={closeOnMobile}>
                      <div className="nav-item-content">
                        <i className={`bi ${item.icon} nav-icon`}></i>
                        <span className="nav-label">{item.label}</span>
                      </div>
                      {active && <div className="nav-indicator"></div>}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <i className="bi bi-box-arrow-right"></i>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
