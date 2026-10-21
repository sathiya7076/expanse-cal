import { Suspense } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/ui/Spinner';

export default function AuthLayout() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner className="min-h-dvh" />;
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,32rem)]">
      <aside className="hidden flex-col justify-between bg-ink p-12 text-white lg:flex">
        <p className="text-xl font-bold">SmartSpend</p>
        <div>
          <p className="max-w-md text-4xl font-semibold leading-tight">
            Photograph the bill. Check the numbers. Save the expense.
          </p>
          <p className="mt-4 max-w-md text-white/70">
            Your salary, side income and spending in one place, with receipts read for you.
          </p>
        </div>
        <p className="text-sm text-white/60">Nothing is saved from a scan until you confirm it.</p>
      </aside>
      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <p className="mb-8 text-xl font-bold text-brand-700 lg:hidden">SmartSpend</p>
          <Suspense fallback={<Spinner />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
