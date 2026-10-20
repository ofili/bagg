import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4 text-center">
      <h1 className="text-4xl font-extrabold text-neutral-900 tracking-tight">404</h1>
      <h2 className="text-lg font-semibold text-neutral-700 mt-2">Page Not Found</h2>
      <p className="text-xs text-neutral-500 mt-1 max-w-sm">
        The page or invoice link you requested does not exist or may have been moved.
      </p>
      <Link
        href="/"
        className="mt-6 px-4 py-2 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition"
      >
        Return to Home
      </Link>
    </div>
  );
}
