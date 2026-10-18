import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="empty-state">
      <span className="eyebrow">404 · A WRONG TURN</span>
      <h1>This corner is still a little quiet.</h1>
      <p>That space or product isn’t available. There’s plenty more to discover.</p>
      <Link href="/" className="button primary">
        Back to Discover
      </Link>
    </div>
  );
}
