// Shown immediately on navigation while the next page's data loads. Also lets Next prefetch
// the page shell, which is what makes tab switches feel instant.
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="skeleton title" />
      <div className="grid stats">
        <div className="skeleton stat" />
        <div className="skeleton stat" />
        <div className="skeleton stat" />
        <div className="skeleton stat" />
      </div>
      <div className="section skeleton block" />
    </div>
  );
}
