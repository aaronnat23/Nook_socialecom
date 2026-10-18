export default function Loading() {
  return (
    <div className="page-wrap skeleton-page" aria-label="Loading">
      <div className="skeleton hero-skeleton" />
      <div className="skeleton" style={{ height: 50, width: '40%' }} />
      <div className="product-grid">
        {[1, 2, 3, 4].map((x) => (
          <div key={x} className="skeleton" style={{ height: 300 }} />
        ))}
      </div>
    </div>
  );
}
