import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-6xl font-semibold text-accent">404</p>
      <p className="mt-2 text-base">That page isn&apos;t in the lot.</p>
      <Link to="/" className="mt-4 inline-block text-sm text-accent underline">
        Back to inventory
      </Link>
    </div>
  );
}
