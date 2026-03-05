import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCartStore } from "../store/useCartStore";
import { useProduct } from "../hooks/useProduct";
import { useProductRating } from "../hooks/useProductRating";
import { RatingStars } from "../components/Ratings/RatingStars";
import "./ProductPage.css";
import { WriteReviewModal } from "../components/Ratings/WriteReviewModal";
import { ProductCard } from "../components/Product/ProductCard";
import { useRelatedProduct } from "../hooks/useRelatedProduct";
import { toast } from "react-toastify";

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { product, loading } = useProduct(Number(id));
  const [showReviewModal, setShowReviewModal] = useState(false);
  const { rating, count, reviews, refresh } = useProductRating(Number(id));

  const { addToCart, addToWishlist, removeFromWishlist, wishlistItems } = useCartStore();
  const { relatedProducts } = useRelatedProduct(Number(id));
  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [tab, setTab] = useState<"desc" | "specs" | "reviews">("desc");
  const [expandedDesc, setExpandedDesc] = useState<string | null>(null);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="product-page-loading">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3 text-muted">Loading product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-page-error">
        <div className="error-content">
          <i className="bi bi-exclamation-triangle-fill error-icon"></i>
          <h3 className="error-title">Product Not Found</h3>
          <p className="error-text">The product you're looking for doesn't exist.</p>
          <button className="btn btn-primary" onClick={() => navigate("/shop")}>
            <i className="bi bi-arrow-left me-2"></i>
            Back to Shop
          </button>
        </div>
      </div>
    );
  }

  const variant = product.variants[selectedVariantIndex];

  const isInWishlist = wishlistItems.some(
    (x) => x.productId === product.id && x.variantId === variant.id
  );

  const handleAddToCart = () => {
    if (!variant.isInStock) {
      toast.warning("This product is currently out of stock");
      return;
    }

    for (let i = 0; i < qty; i++) {
      addToCart({
        productId: product.id,
        variantId: variant.id,
        name: product.name,
        image: product.images[0],
        price: variant.price,
        comparePrice: variant.comparePrice,
        weight: variant.weight,
        unit: variant.unit.symbol,
        stock: variant.stock,
      });
    }
    setAdded(true);
    toast.success(`${qty} item(s) added to cart`);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleWishlistToggle = () => {
    if (isInWishlist) {
      removeFromWishlist(product.id, variant.id);
      toast.info("Removed from wishlist");
    } else {
      addToWishlist({
        productId: product.id,
        variantId: variant.id,
        name: product.name,
        image: product.images[0],
        price: variant.price,
        comparePrice: variant.comparePrice,
        weight: variant.weight,
        unit: variant.unit.symbol,
        stock: variant.stock,
      });
      toast.success("Added to wishlist");
    }
  };

  return (
    <div className="product-page">
      <div className="product-container">
        {/* Breadcrumb */}
        <nav className="product-breadcrumb">
          <button className="breadcrumb-link" onClick={() => navigate("/shop")}>
            <i className="bi bi-house me-1"></i>
            Shop
          </button>
          <i className="bi bi-chevron-right breadcrumb-separator"></i>
          {product.category && (
            <>
              <span className="breadcrumb-text">{product.category.name}</span>
              <i className="bi bi-chevron-right breadcrumb-separator"></i>
            </>
          )}
          <span className="breadcrumb-text">{product.name}</span>
        </nav>

        <div className="product-grid">
          {/* Image Gallery */}
          <div className="product-images">
            <div className="product-main-image">
              <div className="product-image-container">
                <img
                  src={product.images[activeImage]}
                  alt={product.name}
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              </div>
              {product.isBestSelling && (
                <div className="best-seller-badge">
                  <i className="bi bi-star-fill me-1"></i>
                  Best Seller
                </div>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="product-thumbnails">
                {product.images.map((img, i) => (
                  <div
                    key={i}
                    className={`thumbnail-item ${i === activeImage ? "active" : ""}`}
                    onClick={() => setActiveImage(i)}>
                    <img src={img} alt={`${product.name} view ${i + 1}`} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="product-info">
            <div className="product-header">
              <h1 className="product-title">{product.name}</h1>
              <button
                className={`wishlist-btn ${isInWishlist ? "active" : ""}`}
                onClick={handleWishlistToggle}
                aria-label={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}>
                <i className={`bi ${isInWishlist ? "bi-heart-fill" : "bi-heart"}`}></i>
              </button>
            </div>

            {product.description && (
              <div className="product-description">
                <p>{product.description}</p>
              </div>
            )}

            <div className="product-rating">
              <RatingStars rating={rating} count={count} />
              {count > 0 && (
                <span className="rating-text">
                  ({count} {count === 1 ? "review" : "reviews"})
                </span>
              )}
            </div>

            <div className="product-price-section">
              <div className="product-price">
                {formatCurrency(variant.price)}
              </div>
              {variant.comparePrice > variant.price && (
                <div className="product-compare-price">
                  <span className="compare-price">{formatCurrency(variant.comparePrice)}</span>
                  <span className="discount-badge">
                    {Math.round(((variant.comparePrice - variant.price) / variant.comparePrice) * 100)}% OFF
                  </span>
                </div>
              )}
            </div>

            <div className="product-stock">
              {variant.isInStock ? (
                <div className="stock-badge in-stock">
                  <i className="bi bi-check-circle-fill me-1"></i>
                  In Stock ({variant.stock} available)
                </div>
              ) : (
                <div className="stock-badge out-of-stock">
                  <i className="bi bi-x-circle-fill me-1"></i>
                  Out of Stock
                </div>
              )}
            </div>

            {/* Variants */}
            {product.variants.length > 1 && (
              <div className="product-variants">
                <label className="variants-label">
                  <i className="bi bi-box-seam me-2"></i>
                  Select Variant
                </label>
                <div className="variants-grid">
                  {product.variants.map((v, i) => (
                    <button
                      key={v.id}
                      onClick={() => {
                        setSelectedVariantIndex(i);
                        setQty(1);
                      }}
                      className={`variant-btn ${i === selectedVariantIndex ? "active" : ""} ${!v.isInStock ? "disabled" : ""}`}
                      disabled={!v.isInStock}>
                      {v.displayWeight}
                      {!v.isInStock && (
                        <span className="variant-stock-badge">Out of Stock</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity & Add to Cart */}
            <div className="product-actions">
              <div className="quantity-selector">
                <label className="quantity-label">
                  <i className="bi bi-123 me-2"></i>
                  Quantity
                </label>
                <div className="qty-controls">
                  <button
                    className="qty-btn"
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    disabled={qty <= 1}>
                    <i className="bi bi-dash"></i>
                  </button>
                  <span className="qty-value">{qty}</span>
                  <button
                    className="qty-btn"
                    onClick={() => setQty(qty + 1)}
                  >
                    <i className="bi bi-plus"></i>
                  </button>
                </div>
              </div>

              <button
                className={`btn-add-to-cart ${added ? "added" : ""}`}
                onClick={handleAddToCart}
                disabled={!variant.isInStock}>
                {added ? (
                  <>
                    <i className="bi bi-check-circle-fill me-2"></i>
                    Added to Cart
                  </>
                ) : (
                  <>
                    <i className="bi bi-cart-plus me-2"></i>
                    Add to Cart
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Seller Information & Services */}
          <div className="seller-services-section">
            <div className="seller-header">
              <div className="seller-brand">
                <i className="bi bi-shop"></i>
                <span>by Alpine</span>
              </div>
              <button className="btn-view-store" onClick={() => navigate("/shop")}>VIEW STORE</button>
            </div>
            <div className="services-list">
              <div className="service-item">
                <i className="bi bi-truck service-icon"></i>
                <div className="service-content">
                  <div className="service-title">Fast Delivery</div>
                  <div className="service-desc">Lightning-fast shipping, guaranteed.</div>
                </div>
              </div>
              <div className="service-item">
                <i className="bi bi-check-circle service-icon"></i>
                <div className="service-content">
                  <div className="service-title">Pickup available at Shop location</div>
                  <div className="service-desc">Usually ready in 24 hours</div>
                </div>
              </div>
              <div className="service-item">
                <i className="bi bi-credit-card service-icon"></i>
                <div className="service-content">
                  <div className="service-title">Payment</div>
                  <div className="service-desc">Payment upon receipt of goods, Payment by card in the department, Google Pay, Online card.</div>
                </div>
              </div>
              <div className="service-item">
                <i className="bi bi-box-arrow-up service-icon"></i>
                <div className="service-content">
                  <div className="service-title">Packaging</div>
                  <div className="service-desc">Research & development value proposition graphical user interface investor.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="product-tabs-section">
          <div className="product-tabs">
            <button
              className={`tab-btn ${tab === "desc" ? "active" : ""}`}
              onClick={() => setTab("desc")}>
              <i className="bi bi-file-text me-2"></i>
              Description
            </button>
            <button
              className={`tab-btn ${tab === "specs" ? "active" : ""}`}
              onClick={() => setTab("specs")}>
              <i className="bi bi-list-check me-2"></i>
              Specifications
            </button>
            <button
              className={`tab-btn ${tab === "reviews" ? "active" : ""}`}
              onClick={() => setTab("reviews")}>
              <i className="bi bi-star me-2"></i>
              Reviews ({count})
            </button>
          </div>

          <div className="tab-content">
            {tab === "desc" && (
              <div className="tab-panel">
                <h3 className="tab-panel-title">Product Information</h3>
                <div className="description-accordion">
                  {product.description && (
                    <div className="desc-item">
                      <button
                        className={`desc-header ${expandedDesc === "overview" ? "expanded" : ""}`}
                        onClick={() =>
                          setExpandedDesc(expandedDesc === "overview" ? null : "overview")
                        }>
                        <span className="desc-title">
                          <i className="bi bi-info-circle me-2"></i>
                          Overview
                        </span>
                        <i
                          className={`bi bi-chevron-${expandedDesc === "overview" ? "up" : "down"}`}></i>
                      </button>
                      {expandedDesc === "overview" && (
                        <div className="desc-content">
                          <p className="desc-text">{product.description}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {product.richDescription && (
                    <div className="desc-item">
                      <button
                        className={`desc-header ${expandedDesc === "details" ? "expanded" : ""}`}
                        onClick={() =>
                          setExpandedDesc(expandedDesc === "details" ? null : "details")
                        }>
                        <span className="desc-title">
                          <i className="bi bi-file-text me-2"></i>
                          Detailed Description
                        </span>
                        <i
                          className={`bi bi-chevron-${expandedDesc === "details" ? "up" : "down"}`}></i>
                      </button>
                      {expandedDesc === "details" && (
                        <div className="desc-content">
                          <div
                            className="desc-rich-text"
                            dangerouslySetInnerHTML={{ __html: product.richDescription }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {!product.description && !product.richDescription && (
                    <p className="tab-panel-text">No description available.</p>
                  )}
                </div>
              </div>
            )}

            {tab === "specs" && (
              <div className="tab-panel">
                <h3 className="tab-panel-title">Specifications</h3>
                <div className="specs-table">
                  <div className="spec-row">
                    <div className="spec-label">SKU</div>
                    <div className="spec-value">#{product.id}</div>
                  </div>
                  <div className="spec-row">
                    <div className="spec-label">Weight</div>
                    <div className="spec-value">{variant.displayWeight}</div>
                  </div>
                  <div className="spec-row">
                    <div className="spec-label">Unit</div>
                    <div className="spec-value">{variant.unit.symbol}</div>
                  </div>
                  <div className="spec-row">
                    <div className="spec-label">Availability</div>
                    <div className="spec-value">
                      {variant.isInStock ? (
                        <span className="spec-badge in-stock">In Stock</span>
                      ) : (
                        <span className="spec-badge out-of-stock">Out of Stock</span>
                      )}
                    </div>
                  </div>
                  {product.category && (
                    <div className="spec-row">
                      <div className="spec-label">Category</div>
                      <div className="spec-value">{product.category.name}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === "reviews" && (
              <div className="tab-panel">
                <div className="reviews-header">
                  <div className="reviews-summary">
                    <div className="reviews-rating">
                      <span className="rating-number">{rating.toFixed(1)}</span>
                      <RatingStars rating={rating} count={1} />
                      <span className="reviews-count-text">
                        Based on {count} {count === 1 ? "review" : "reviews"}
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn-write-review"
                    onClick={() => setShowReviewModal(true)}>
                    <i className="bi bi-pencil-square me-2"></i>
                    Write a Review
                  </button>
                </div>

                {reviews.length === 0 ? (
                  <div className="reviews-empty">
                    <i className="bi bi-chat-left-text"></i>
                    <p>No reviews yet. Be the first to review this product!</p>
                    <button
                      className="btn btn-primary"
                      onClick={() => setShowReviewModal(true)}>
                      Write First Review
                    </button>
                  </div>
                ) : (
                  <div className="reviews-list">
                    {reviews.map((r) => (
                      <div key={r.id} className="review-item">
                        <div className="review-header">
                          <div className="review-author">
                            <div className="review-avatar">
                              <i className="bi bi-person-fill"></i>
                            </div>
                            <div>
                              <div className="review-name">{r.name}</div>
                              <div className="review-date">
                                {new Date(r.createdOnUTC).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </div>
                            </div>
                          </div>
                          <div className="review-rating">
                            <RatingStars rating={r.rating} count={1} />
                          </div>
                        </div>
                        {r.comment && (
                          <div className="review-comment">{r.comment}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="related-products-section">
            <div className="section-header">
              <h2 className="section-title">
                <i className="bi bi-grid-3x3-gap me-2"></i>
                Related Products
              </h2>
            </div>
            <div className="related-products-grid">
              {relatedProducts.map((p) => (
                <div key={p.id} className="related-product-item">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <WriteReviewModal
          productId={product.id}
          onClose={() => setShowReviewModal(false)}
          onSuccess={() => {
            refresh();
            toast.success("Review submitted successfully!");
            setShowReviewModal(false);
          }}
        />
      )}
    </div>
  );
}
