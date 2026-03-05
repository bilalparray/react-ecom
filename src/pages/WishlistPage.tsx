import { useMemo, useState } from "react";
import { useCartStore } from "../store/useCartStore";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

export default function WishlistPage() {
  const { wishlistItems, addToCart, removeFromWishlist } = useCartStore();
  const [search, setSearch] = useState("");
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return wishlistItems.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [wishlistItems, search]);

  const handleAddToCart = (item: any) => {
    addToCart(item);
    const key = `${item.productId}-${item.variantId}`;
    setAddedItems((prev) => new Set(prev).add(key));
    
    setTimeout(() => {
      setAddedItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }, 2000);
  };

  const shareProduct = (product: any) => {
    const url = `${window.location.origin}/product/${product.productId}`;
    navigator.clipboard.writeText(url);
    toast.success("Product link copied");
  };

  return (
    <div className="container py-5" style={{ maxWidth: "900px" }}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold">Wishlist</h3>

        <input
          className="form-control rounded-pill"
          style={{ maxWidth: "280px" }}
          placeholder="Search wishlist..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-heart fs-1 mb-3"></i>
          <p>Your wishlist is empty</p>
        </div>
      ) : (
        <div className="bg-white rounded-4 shadow-sm overflow-hidden">
          {filtered.map((p) => (
            <div
              key={`${p.productId}-${p.variantId}`}
              className="d-flex align-items-center gap-3 p-3 border-bottom">
              {/* Image */}
              <img
                src={p.image}
                style={{
                  width: "70px",
                  height: "70px",
                  objectFit: "cover",
                  borderRadius: "12px",
                }}
              />

              {/* Product Info */}
              <div className="flex-grow-1">
                <Link
                  to={`/product/${p.productId}`}
                  className="fw-semibold text-dark text-decoration-none">
                  {p.name}
                </Link>

                <div className="text-muted small">
                  {p.weight} {p.unit}
                </div>

                <div className="fw-bold" style={{ color: "#F59E0B" }}>
                  ₹{p.price}
                </div>
              </div>

              {/* Actions */}
              <div className="d-flex align-items-center gap-2">
                <button
                  onClick={() => handleAddToCart(p)}
                  className="btn btn-success btn-sm">
                  <i className={`bi ${addedItems.has(`${p.productId}-${p.variantId}`) ? "bi-check-circle-fill" : "bi-cart"}`}></i>
                </button>

                <button
                  onClick={() => shareProduct(p)}
                  className="btn btn-light btn-sm">
                  <i className="bi bi-share"></i>
                </button>

                <button
                  onClick={() => removeFromWishlist(p.productId, p.variantId)}
                  className="btn btn-light btn-sm text-danger">
                  <i className="bi bi-trash"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
