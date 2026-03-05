import { useEffect, useState } from "react";
import { useVideos } from "../../hooks/admin/useVideos";

export default function VideoShowcase() {
  const pageSizeApi = 12;
  const [page] = useState(1);

  const { items, loading } = useVideos(page, pageSizeApi);

  const [index, setIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= 768 : false);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  useEffect(() => {}, [items]);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (loading || items.length === 0) return null;

  const perPage = isMobile ? 1 : 4;
  const visible = items.slice(index, index + perPage);

  const next = () => {
    if (index + perPage < items.length) setIndex(index + perPage);
  };

  const prev = () => {
    if (index - perPage >= 0) setIndex(index - perPage);
  };

  const getYoutubeId = (url?: string) => {
    if (!url) return "";
    try {
      const match = url.match(/(?:youtube\.com\/.*v=|youtu\.be\/)([^&]+)/);
      return match ? match[1] : "";
    } catch {
      return "";
    }
  };

  return (
    <section className="py-5 bg-white">
      <div className="container">
        <h3 className="fw-bold mb-3">Watch & Learn</h3>

        <div className="position-relative">
          <button
            onClick={prev}
            disabled={index === 0}
            className="btn bg-white shadow rounded-circle position-absolute start-0 top-50 translate-middle-y z-3"
            style={{ width: 42, height: 42 }}>
            <i className="bi bi-chevron-left" />
          </button>

          <button
            onClick={next}
            disabled={index + perPage >= items.length}
            className="btn bg-white shadow rounded-circle position-absolute end-0 top-50 translate-middle-y z-3"
            style={{ width: 42, height: 42 }}>
            <i className="bi bi-chevron-right" />
          </button>

          <div className="row g-4 px-md-5">
            {visible.map((v) => {
              const videoId = getYoutubeId(v.youtubeUrl);

              if (!videoId) return null;

              return (
                <div key={v.id} className="col-12 col-md-6">
                  <div
                    className="position-relative rounded-4 overflow-hidden shadow-sm"
                    style={{ aspectRatio: "16/9", cursor: "pointer" }}
                    onClick={() => setActiveVideo(videoId)}>
                    <img
                      src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                      className="w-100 h-100 object-fit-cover"
                    />
                    <div className="position-absolute top-50 start-50 translate-middle text-white fs-1">
                      <i className="bi bi-play-circle-fill" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal */}
      {activeVideo && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-75 d-flex align-items-center justify-content-center z-5"
          onClick={() => setActiveVideo(null)}>
          <div
            className="bg-black rounded-4 overflow-hidden"
            style={{ width: "90%", maxWidth: 900, aspectRatio: "16/9" }}
            onClick={(e) => e.stopPropagation()}>
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1`}
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </section>
  );
}
