import { useEffect, useState } from "react";
import { useTestimonials } from "../../hooks/admin/useTestimonials";

export default function CustomerTestimonials() {
  const pageSizeApi = 10; // fetch enough for smooth sliding
  const [page] = useState(1);

  const { items, loading } = useTestimonials(page, pageSizeApi);

  const [index, setIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (loading || items.length === 0) return null;

  const pageSize = isMobile ? 1 : 2;
  const visible = items.slice(index, index + pageSize);
  const totalPages = Math.ceil(items.length / pageSize);

  const next = () => {
    if (index + pageSize < items.length) {
      setIndex(index + pageSize);
    }
  };

  const prev = () => {
    if (index - pageSize >= 0) {
      setIndex(index - pageSize);
    }
  };

  return (
    <section className="py-5 bg-light">
      <div className="container">
        <div className="text-center mb-4">
          <h2 className="fw-bold">Customers</h2>
          <p className="text-muted">What our customers say</p>
        </div>

        <div className="position-relative">
          {/* arrows */}
          <button
            onClick={prev}
            disabled={index === 0}
            className="btn bg-white shadow rounded-circle position-absolute start-0 top-50 translate-middle-y z-3"
            style={{ width: 42, height: 42 }}>
            <i className="bi bi-chevron-left" />
          </button>

          <button
            onClick={next}
            disabled={index + pageSize >= items.length}
            className="btn bg-white shadow rounded-circle position-absolute end-0 top-50 translate-middle-y z-3"
            style={{ width: 42, height: 42 }}>
            <i className="bi bi-chevron-right" />
          </button>

          {/* cards */}
          <div className="row g-4 px-md-5">
            {visible.map((t) => (
              <div key={t.id} className={`col-12 col-md-6`}>
                <div className="bg-white rounded-4 p-4 h-100 shadow-sm d-flex flex-column">
                  <p className="text-muted flex-grow-1 fs-6">
                    “
                    {t.message.length > 220
                      ? t.message.slice(0, 220) + "…"
                      : t.message}
                    ”
                  </p>

                  <div className="d-flex gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <i
                        key={i}
                        className={
                          i <= t.rating
                            ? "bi bi-star-fill text-warning"
                            : "bi bi-star text-secondary"
                        }
                      />
                    ))}
                  </div>

                  <hr className="my-3" />

                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                      style={{
                        width: 48,
                        height: 48,
                        background: "linear-gradient(135deg,#6366f1,#3b82f6)",
                      }}>
                      {t.name.charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <div className="fw-semibold">{t.name}</div>
                      <div className="small text-muted">{t.email}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* dots */}
          <div className="d-flex justify-content-center gap-2 mt-4">
            {Array.from({ length: totalPages }).map((_, i) => (
              <div
                key={i}
                onClick={() => setIndex(i * pageSize)}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: i * pageSize === index ? "#f59e0b" : "#d1d5db",
                  cursor: "pointer",
                  transition: "all .2s",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
