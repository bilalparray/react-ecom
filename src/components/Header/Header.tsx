import { Link, NavLink, useNavigate } from "react-router-dom";
import { useCartStore } from "../../store/useCartStore";
import { useCategories } from "../../hooks/useCategories";
import "./Header.css";
import { useEffect, useRef, useState } from "react";
import { searchProductFromHeader } from "../../services/ProductService";

export function Header() {
  const navigate = useNavigate();
  const {
    cartCount,
    wishlistCount,
    cartItems,
    increaseQty,
    decreaseQty,
    removeFromCart,
  } = useCartStore();
  const { categories } = useCategories();
  const [showCat, setShowCat] = useState(false);
  const [showCatMobile, setShowCatMobile] = useState(false);
  const [showStickyNav, setShowStickyNav] = useState(false);

  // Header search modal state
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [modalQuery, setModalQuery] = useState("");
  const [modalResults, setModalResults] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const catRef = useRef<HTMLDivElement>(null);
  const catRefMob = useRef<HTMLDivElement>(null);
  const go = (url: string) => {
    navigate(url);
    return;
  };
  const goToCategory = (url: string) => {
    // First let the tap complete
    requestAnimationFrame(() => {
      navigate(url);
    });

    // Then close the dropdown AFTER navigation is queued
    setTimeout(() => {
      setShowCat(false);
      setShowCatMobile(false);
    }, 0);
  };

  useEffect(() => {
    let scrollTimeout: ReturnType<typeof setTimeout>;

    function handleClickOutside(e: MouseEvent) {
      if (catRef.current && !catRef.current.contains(e.target as Node)) {
        setShowCat(false);
      }
    }

    function handleScroll() {
      // Close dropdown on page scroll, but allow clicks to register first
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setShowCat(false);
      }, 100);
    }

    if (showCat) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", handleScroll, { passive: true });

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        window.removeEventListener("scroll", handleScroll);
        clearTimeout(scrollTimeout);
      };
    }
  }, [showCat]);
  useEffect(() => {
    let scrollTimeout: ReturnType<typeof setTimeout>;

    function handleClickOutside(e: MouseEvent) {
      if (catRefMob.current && !catRefMob.current.contains(e.target as Node)) {
        setShowCatMobile(false);
      }
    }

    function handleScroll() {
      // Close dropdown on page scroll, but allow clicks to register first
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setShowCatMobile(false);
      }, 150);
    }

    if (showCatMobile) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", handleScroll, { passive: true });

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        window.removeEventListener("scroll", handleScroll);
        clearTimeout(scrollTimeout);
      };
    }
  }, [showCatMobile]);

  useEffect(() => {
    let ticking = false;

    const updateScrollState = () => {
      const scrollY = window.scrollY;
      // Show sticky nav when scrolled past 100px
      setShowStickyNav(scrollY > 100);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollState);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ================= SEARCH MODAL (DEBOUNCE) ================= */
  useEffect(() => {
    if (!showSearchModal) return;

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }

    const q = modalQuery.trim();
    if (!q) {
      setModalResults([]);
      setModalLoading(false);
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      setModalLoading(true);
      try {
        const res = await searchProductFromHeader(q);
        setModalResults(Array.isArray(res) ? res : []);
      } catch {
        setModalResults([]);
      } finally {
        setModalLoading(false);
      }
    }, 400);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }
    };
  }, [modalQuery, showSearchModal]);

  const closeSearchModal = () => {
    setShowSearchModal(false);
    setModalQuery("");
    setModalResults([]);
    setModalLoading(false);
  };

  const handleSearchResultClick = (id: number) => {
    closeSearchModal();
    navigate(`/product/${id}`);
  };
  /* ================= MOBILE ================= */
  const MobileHeader = () => (
    <div className="d-lg-none">
      <div className="mp-sale-bar">
        Sale ends: 671 Days 18 Hours 14 Minutes 55 Sec.
      </div>

      <div className="mp-mobile-top">
        <Link to="/" className="d-flex align-items-center gap-2">
          <img src="/alpine.png" className="mp-logo" />
          <span className="fw-bold brand">Alpine Saffron </span>
        </Link>

        <div className="d-flex align-items-center gap-3">
          <button className="icon-btn" onClick={() => setShowSearchModal(true)}>
            <i className="bi bi-search desktop-icons"></i>
          </button>
          <Link to="/myorders">
            <i className="bi bi-bag desktop-icons"></i>
          </Link>
          <Link to="/wishlist" className="position-relative icon-btn">
            <i className="bi bi-heart desktop-icons"></i>
            {wishlistCount > 0 && (
              <span className="mp-badge">{wishlistCount}</span>
            )}
          </Link>

          <button
            className="position-relative icon-btn"
            data-bs-toggle="offcanvas"
            data-bs-target="#cartDrawer">
            <i className="bi bi-cart"></i>
            {cartCount > 0 && <span className="mp-badge">{cartCount}</span>}
          </button>
        </div>
      </div>

      <div className="mp-mobile-browse">
        <button
          className="mp-browse-btn"
          onClick={() => setShowCatMobile((v) => !v)}>
          <i className="bi bi-grid"></i> Categories
          <i className="bi bi-chevron-down"></i>
        </button>
        {showCatMobile && (
          <div ref={catRefMob} className="mp-cat-dropdown">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => goToCategory(`/category/${c.id}`)}
                className="mp-cat-item">
                <img src={c.image} alt={c.name} />
                <span>{c.name}</span>
                <i className="bi bi-chevron-right"></i>
              </button>
            ))}
          </div>
        )}

        <button
          className="mp-hamburger"
          data-bs-toggle="offcanvas"
          data-bs-target="#mobileMenu">
          <i className="bi bi-list"></i>
        </button>
      </div>
    </div>
  );

  /* ================= DESKTOP ================= */
  const DesktopHeader = () => (
    <div className="d-none d-lg-block">
      <div className="mp-top-bar">
        <div className="container d-flex justify-content-between">
          <div>
            10, Nh44, Near J&K Bank, Barsoo, Jammu and Kashmir, 192122 • +91
            9541560938 +917051476537 • alpinesaffron24@gmail.com
          </div>
          <div className="d-flex gap-3">
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

      <div className="mp-main-header container">
        <Link to="/" className="d-flex align-items-center gap-3">
          <img src="/alpine.png" className="mp-logo" />
          <span className="mp-brand">Alpine Saffron </span>
        </Link>

        {/* Open search modal instead of navigating to shop */}
        <div
          className="mp-search"
          onClick={() => setShowSearchModal(true)}
          role="button">
          <input placeholder="Search for products..." readOnly />
          <button type="button">
            <i className="bi bi-search"></i>
          </button>
        </div>

        <div className="mp-icons ">
          <Link to="/myorders">
            <i className="bi bi-bag desktop-icons"></i>
          </Link>

          <Link to="/wishlist" className="position-relative">
            <i className="bi bi-heart desktop-icons"></i>
            {wishlistCount > 0 && (
              <span className="mp-badge">{wishlistCount}</span>
            )}
          </Link>

          <button
            className="icon-btn position-relative"
            data-bs-toggle="offcanvas"
            data-bs-target="#cartDrawer">
            <i className="bi bi-cart"></i>
            {cartCount > 0 && <span className="mp-badge">{cartCount}</span>}
          </button>
        </div>
      </div>

      <div className="mp-nav container">
        <div className="mp-nav-left">
          <div
            className="mp-browse-wrapper"
            onMouseEnter={() => setShowCat(true)}
            onMouseLeave={() => setShowCat(false)}>
            <button className="mp-browse-btn">
              <i className="bi bi-grid"></i>Categories
              <i className="bi bi-chevron-down"></i>
            </button>
            {showCat && (
              <div ref={catRef} className="mp-cat-dropdown">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => goToCategory(`/category/${c.id}`)}
                    className="mp-cat-item">
                    <img src={c.image} alt={c.name} />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mp-links">
            <NavLink to="/">Home</NavLink>
            <NavLink to="/shop">Shop</NavLink>
            <NavLink to="/contact">Contact</NavLink>
            <NavLink to="/about">About us</NavLink>
          </div>
        </div>

        <div className="mp-help">Need help? +91 9541560938</div>
      </div>
    </div>
  );

  const [showStickyCat, setShowStickyCat] = useState(false);
  const stickyCatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        stickyCatRef.current &&
        !stickyCatRef.current.contains(e.target as Node)
      ) {
        setShowStickyCat(false);
      }
    }

    function handleScroll() {
      setShowStickyCat(false);
    }

    if (showStickyCat) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", handleScroll, { passive: true });
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [showStickyCat]);

  const goToCategorySticky = (url: string) => {
    requestAnimationFrame(() => {
      navigate(url);
    });
    setTimeout(() => {
      setShowStickyCat(false);
    }, 0);
  };

  return (
    <>
      <header>
        <MobileHeader />
        <DesktopHeader />

        {/* Mobile Menu */}
        <div className="offcanvas offcanvas-end" id="mobileMenu">
          <div className="offcanvas-header">
            <h5 className="fw-bold">Menu</h5>
            <button className="btn-close" data-bs-dismiss="offcanvas"></button>
          </div>

          <div className="offcanvas-body mobile-menu">
            <div className="menu-section">
              <button data-bs-dismiss="offcanvas" onClick={() => go("/")}>
                Home
              </button>
              <button data-bs-dismiss="offcanvas" onClick={() => go("/shop")}>
                Shop
              </button>
              <button
                data-bs-dismiss="offcanvas"
                onClick={() => go("/contact")}>
                Contact
              </button>
              <button data-bs-dismiss="offcanvas" onClick={() => go("/about")}>
                About
              </button>
            </div>

            <h6 className="menu-title">Categories</h6>

            <div className="menu-section">
              {categories.map((c) => (
                <button
                  data-bs-dismiss="offcanvas"
                  key={c.id}
                  onClick={() => go(`/category/${c.id}`)}>
                  <span>{c.name}</span>
                  <i className="bi bi-chevron-right"></i>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cart */}
        {/* Cart */}
        <div
          className="offcanvas offcanvas-end"
          tabIndex={-1}
          id="cartDrawer"
          aria-labelledby="cartDrawerLabel"
          style={{ width: "420px" }}>
          {/* Header */}
          <div className="offcanvas-header border-bottom">
            <h5 className="fw-bold">Your Cart ({cartCount})</h5>
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="offcanvas"></button>
          </div>

          {/* Body */}
          <div className="offcanvas-body d-flex flex-column p-0">
            {cartItems.length === 0 ? (
              <div className="flex-grow-1 d-flex flex-column justify-content-center align-items-center text-muted">
                <i className="bi bi-cart fs-1 mb-3"></i>
                <p>Your cart is empty</p>
              </div>
            ) : (
              <>
                {/* Items */}
                <div className="flex-grow-1 overflow-auto p-3">
                  {cartItems.map((item) => (
                    <div
                      key={`${item.productId}-${item.variantId}`}
                      className="d-flex gap-3 mb-4 align-items-center">
                      <img
                        src={item.image}
                        style={{
                          width: "70px",
                          height: "70px",
                          objectFit: "cover",
                          borderRadius: "12px",
                        }}
                      />

                      <div className="flex-grow-1">
                        <div className="fw-semibold">{item.name}</div>
                        <div className="small text-muted">
                          {item.weight} {item.unit}
                        </div>

                        <div className="d-flex align-items-center gap-3 mt-2">
                          <div className="fw-bold">₹{item.price}</div>

                          <div className="d-flex border rounded-pill overflow-hidden">
                            <button
                              className="btn px-2"
                              onClick={() =>
                                decreaseQty(item.productId, item.variantId)
                              }>
                              −
                            </button>
                            <div className="px-3 fw-semibold cart-drawer-qty">
                              {item.qty}
                            </div>
                            <button
                              className="btn px-2"
                              onClick={() =>
                                increaseQty(item.productId, item.variantId)
                              }>
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          removeFromCart(item.productId, item.variantId)
                        }
                        className="btn btn-sm text-danger">
                        <i className="bi bi-x-lg"></i>
                      </button>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="border-top p-4">
                  <div className="d-flex justify-content-between mb-3">
                    <span className="fw-semibold">Subtotal</span>
                    <span className="fw-bold">₹{total.toFixed(2)}</span>
                  </div>
                  <button
                    className="btn btn-success w-50 py-3 rounded-pill"
                    data-bs-dismiss="offcanvas"
                    onClick={() => navigate("/cart")}>
                    View Cart
                  </button>
                  <button
                    className="btn btn-success w-50 py-3 rounded-pill"
                    data-bs-dismiss="offcanvas"
                    onClick={() => navigate("/checkout")}>
                    Checkout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* SEARCH MODAL */}
        {showSearchModal && (
          <div className="search-modal-backdrop" onClick={closeSearchModal}>
            <div className="search-modal" onClick={(e) => e.stopPropagation()}>
              <div className="search-modal-header">
                <h5 className="search-modal-title">Search products</h5>
                <button
                  type="button"
                  className="search-modal-close"
                  onClick={closeSearchModal}
                  aria-label="Close search">
                  <i className="bi bi-x-lg" />
                </button>
              </div>

              <input
                className="search-modal-input"
                type="text"
                placeholder="Type to search…"
                autoFocus
                value={modalQuery}
                onChange={(e) => setModalQuery(e.target.value)}
              />

              <div className="search-modal-results">
                {modalLoading ? (
                  <div className="search-modal-loading">
                    <div
                      className="spinner-border spinner-border-sm text-primary"
                      role="status">
                      <span className="visually-hidden">Loading…</span>
                    </div>
                    <span className="ms-2">Searching…</span>
                  </div>
                ) : !modalQuery.trim() ? null : modalResults.length === 0 ? (
                  <div className="search-modal-empty">
                    <i className="bi bi-search" />
                    <span>No products found</span>
                  </div>
                ) : (
                  modalResults.map((p: any) => (
                    <button
                      key={p.id}
                      type="button"
                      className="search-modal-item"
                      onClick={() => handleSearchResultClick(p.id)}>
                      {p.thumbnail && <img src={p.thumbnail} alt={p.name} />}
                      <span className="search-modal-name">{p.name}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Sticky Navigation Bar - Desktop */}
      {showStickyNav && (
        <div className="mp-sticky-nav d-none d-lg-block">
          <div className="mp-sticky-nav-content container">
            <div className="mp-nav-left">
              <div
                className="mp-browse-wrapper"
                onMouseEnter={() => setShowStickyCat(true)}
                onMouseLeave={() => setShowStickyCat(false)}>
                <button className="mp-browse-btn">
                  <i className="bi bi-grid"></i>Categories
                  <i className="bi bi-chevron-down"></i>
                </button>
                {showStickyCat && (
                  <div ref={stickyCatRef} className="mp-cat-dropdown">
                    {categories.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => goToCategorySticky(`/category/${c.id}`)}
                        className="mp-cat-item">
                        <img src={c.image} alt={c.name} />
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mp-links">
                <NavLink to="/">Home</NavLink>
                <NavLink to="/shop">Shop</NavLink>
                <NavLink to="/contact">Contact</NavLink>
                <NavLink to="/about">About us</NavLink>
              </div>
            </div>

            <div className="mp-help">Need help? +91 9541560938</div>
          </div>
        </div>
      )}

      {/* Sticky Navigation Bar - Mobile */}
      {showStickyNav && (
        <div className="mp-sticky-nav-mobile d-lg-none">
          <div className="mp-sticky-nav-mobile-content">
            <button
              className="mp-browse-btn"
              onClick={() => setShowStickyCat((v) => !v)}>
              <i className="bi bi-grid"></i>Categories
              <i className="bi bi-chevron-down"></i>
            </button>
            {showStickyCat && (
              <div ref={stickyCatRef} className="mp-cat-dropdown">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => goToCategorySticky(`/category/${c.id}`)}
                    className="mp-cat-item">
                    <img src={c.image} alt={c.name} />
                    <span>{c.name}</span>
                    <i className="bi bi-chevron-right"></i>
                  </button>
                ))}
              </div>
            )}

            <div className="d-flex align-items-center gap-3">
              <button
                className="icon-btn"
                onClick={() => setShowSearchModal(true)}>
                <i className="bi bi-search desktop-icons"></i>
              </button>
              <Link to="/myorders">
                <i className="bi bi-bag desktop-icons"></i>
              </Link>
              <Link to="/wishlist" className="position-relative icon-btn">
                <i className="bi bi-heart desktop-icons"></i>
                {wishlistCount > 0 && (
                  <span className="mp-badge">{wishlistCount}</span>
                )}
              </Link>
              <button
                className="position-relative icon-btn"
                data-bs-toggle="offcanvas"
                data-bs-target="#cartDrawer">
                <i className="bi bi-cart"></i>
                {cartCount > 0 && <span className="mp-badge">{cartCount}</span>}
              </button>
              <button
                className="mp-hamburger"
                data-bs-toggle="offcanvas"
                data-bs-target="#mobileMenu">
                <i className="bi bi-list"></i>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
