import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <h1 className="text-3xl font-semibold">Page not found</h1>
        <p className="mt-2 text-muted">That address doesn't exist in SmartSpend.</p>
        <Link to="/dashboard" className="mt-6 inline-flex min-h-10 items-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
