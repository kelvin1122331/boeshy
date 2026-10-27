export default function Loading() {
  return (
    <div className="loading-page" aria-label="Memuat workspace">
      <div className="skeleton" style={{ width: "35%", height: 36 }} />
      <div className="skeleton" style={{ width: "65%", height: 18 }} />
      <div className="skeleton" style={{ height: 220 }} />
      <div className="tool-grid">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div className="skeleton" key={i} style={{ height: 140 }} />
        ))}
      </div>
    </div>
  );
}
