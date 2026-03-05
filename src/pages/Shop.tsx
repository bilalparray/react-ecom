import { useMemo, useState } from "react";
import { useProducts } from "../hooks/useProducts";
import { ProductCard } from "../components/Product/ProductCard";

export default function Shop() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"price-asc" | "price-desc" | "az" | "za">(
    "az"
  );

  const { products, total, loading } = useProducts(page, pageSize);

  const totalPages = Math.ceil(total / pageSize);

  /* Filtering + searching + sorting */
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Filter out products without valid variants
    list = list.filter((p) => {
      const defaultVariant = p.variants?.find((v) => v.isDefault) || p.variants?.[0];
      return defaultVariant && p.variants && p.variants.length > 0 && defaultVariant.unit;
    });

    if (search) {
      list = list.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (sort === "az") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    if (sort === "za") {
      list.sort((a, b) => b.name.localeCompare(a.name));
    }

    if (sort === "price-asc") {
      list.sort((a, b) => {
        const variantA = a.variants.find((v) => v.isDefault) || a.variants[0];
        const variantB = b.variants.find((v) => v.isDefault) || b.variants[0];
        const priceA = variantA?.price || 0;
        const priceB = variantB?.price || 0;
        return priceA - priceB;
      });
    }

    if (sort === "price-desc") {
      list.sort((a, b) => {
        const variantA = a.variants.find((v) => v.isDefault) || a.variants[0];
        const variantB = b.variants.find((v) => v.isDefault) || b.variants[0];
        const priceA = variantA?.price || 0;
        const priceB = variantB?.price || 0;
        return priceB - priceA;
      });
    }

    return list;
  }, [products, search, sort]);

  return (
    <div className="container py-5">
      {/* Top bar */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <h3 className="fw-bold">Shop</h3>

        <div className="d-flex gap-2 flex-wrap">
          {/* Search */}
          <input
            className="form-control rounded-pill"
            style={{ width: "240px" }}
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* Sort */}
          <select
            className="form-select rounded-pill"
            style={{ width: "200px" }}
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}>
            <option value="az">Name: A → Z</option>
            <option value="za">Name: Z → A</option>
            <option value="price-asc">Price: Low → High</option>
            <option value="price-desc">Price: High → Low</option>
          </select>

          {/* Page size */}
          <select
            className="form-select rounded-pill"
            style={{ width: "140px" }}
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}>
            <option value={10}>10 / page</option>
            <option value={12}>12 / page</option>
            <option value={24}>24 / page</option>
            <option value={48}>48 / page</option>
          </select>
        </div>
      </div>

      {/* Products */}
      {loading ? (
        <div className="text-center py-5">Loading…</div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-5 text-muted">No products found</div>
      ) : (
        <div className="row g-4">
          {filteredProducts.map((p) => (
            <div className="col-xl-3 col-lg-4 col-md-6" key={p.id}>
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="d-flex justify-content-center gap-2 mt-5">
        {Array.from({ length: totalPages }).map((_, i) => (
          <button
            key={i}
            onClick={() => setPage(i + 1)}
            className={`btn ${page === i + 1 ? "btn-success" : "btn-outline-secondary"
              }`}>
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
