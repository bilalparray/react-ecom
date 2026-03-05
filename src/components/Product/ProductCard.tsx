import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCartStore } from "../../store/useCartStore";
import type { Product } from "../../models/Product";
import type { ProductVariant } from "../../models/ProductVaraint";
import { RatingStars } from "../Ratings/RatingStars";
import { useProductRating } from "../../hooks/useProductRating";
import "./ProductCard.css";

type Props = {
  product: Product;
};

export function ProductCard({ product }: Props) {
  const { addToCart, addToWishlist, removeFromWishlist, wishlistItems } =
    useCartStore();
  const [added, setAdded] = useState(false);

  const { rating, count } = useProductRating(product.id);

  const defaultVariant =
    product.variants?.find((v) => v.isDefault) || product.variants?.[0];

  const [variant, setVariant] = useState<ProductVariant | undefined>(defaultVariant);

  useEffect(() => {
    setVariant(defaultVariant);
  }, [product]);

  // Early return if no variant exists
  if (!variant || !product.variants || product.variants.length === 0 || !variant.unit) {
    return null;
  }

  // TypeScript guard: variant is guaranteed to be defined after the check above
  const safeVariant = variant;

  const price = safeVariant.price || 0;
  const compare = safeVariant.comparePrice || 0;
  const discount =
    compare > price ? Math.round(((compare - price) / compare) * 100) : 0;

  const isWishlisted = wishlistItems.some(
    (x) => x.productId === product.id && x.variantId === safeVariant.id
  );

  function handleWishlist() {
    const payload = {
      productId: product.id,
      variantId: safeVariant.id,
      name: product.name,
      image: product.images?.[0],
      price: safeVariant.price,
      comparePrice: safeVariant.comparePrice,
      weight: safeVariant.weight,
      unit: safeVariant.unit.symbol,
      stock: safeVariant.stock,
    };

    if (isWishlisted) {
      removeFromWishlist(product.id, safeVariant.id);
    } else {
      addToWishlist(payload);
    }
  }

  function handleAddToCart() {
    addToCart({
      productId: product.id,
      variantId: safeVariant.id,
      name: product.name,
      image: product.images?.[0],
      price: safeVariant.price,
      comparePrice: safeVariant.comparePrice,
      weight: safeVariant.weight,
      unit: safeVariant.unit.symbol,
      stock: safeVariant.stock,
    });
    setAdded(true);

    setTimeout(() => {
      setAdded(false);
    }, 1200);
  }

  return (
    <div className="product-card">
      {/* IMAGE */}
      <div className="pc-image">
        <Link to={`/product/${product.id}`}>
          <img src={product.images?.[0]} alt={product.name} />
        </Link>

        {discount > 0 && <span className="pc-sale">Sale {discount}%</span>}

        <button className="pc-wish" onClick={handleWishlist}>
          <i
            className={`bi ${isWishlisted ? "bi-heart-fill text-danger" : "bi-heart"
              }`}
          />
        </button>
      </div>

      {/* BODY */}
      <div className="pc-body">
        <p className="pc-brand">By Alpine</p>
        <Link to={`/product/${product.id}`}>
          <h3 className="pc-title">{product.name}</h3>
        </Link>
        <div className="description">
          <p>{product.description.slice(0, 100)}</p>
        </div>
        <div className="pc-rating">
          <RatingStars rating={rating} count={count} />
        </div>

        <div className="pc-price">
          <span>₹{price}/{safeVariant.unit.symbol}</span>
          {compare > price && <del>₹{compare}/{safeVariant.unit.symbol}</del>}
        </div>

        {product.variants.length > 1 && (
          <select
            className="pc-variant"
            value={safeVariant.id}
            onChange={(e) =>
              setVariant(
                product.variants.find((v) => v.id === Number(e.target.value))!
              )
            }>
            {product.variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.displayWeight} – ₹{v.price}
              </option>
            ))}
          </select>
        )}
      </div>

      <button
        disabled={!safeVariant.isInStock}
        onClick={handleAddToCart}
        className="pc-cart">
        {added ? (
          <>
            <i
              className="bi bi-check-circle-fill"
              style={{ color: "#ffffff" }}
            />
            Added
          </>
        ) : (
          <>
            <i className="bi bi-cart"></i>
            {safeVariant.isInStock ? "Add To Cart" : "Out of Stock"}
          </>
        )}
      </button>
    </div>
  );
}
