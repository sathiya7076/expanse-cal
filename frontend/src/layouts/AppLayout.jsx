import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  FiBarChart2, FiBriefcase, FiCamera, FiCreditCard, FiHome, FiLogOut,
  FiMenu, FiPieChart, FiTarget, FiTrendingUp, FiUser, FiX,
} from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/ui/Spinner';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: FiHome },
  { to: '/salary', label: 'Salary', icon: FiBriefcase },
  { to: '/income', label: 'Income', icon: FiTrendingUp },
  { to: '/expenses', label: 'Expenses', icon: FiCreditCard },
  { to: '/scan-receipt', label: 'Scan Receipt', icon: FiCamera },
  { to: '/budgets', label: 'Budgets', icon: FiPieChart },
  { to: '/savings-goals', label: 'Savings Goals', icon: FiTarget },
  { to: '/reports', label: 'Reports', icon: FiBarChart2 },
  { to: '/profile', label: 'Profile', icon: FiUser },
];

function NavList({ onNavigate }) {
  const { logout, user } = useAuth();
  return (
    <nav aria-label="Primary" className="flex h-full flex-col gap-1 p-4">
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
              isActive ? 'bg-brand-50 text-brand-700' : 'text-ink hover:bg-ink/5'
            }`
          }
        >
          <Icon className="size-5" aria-hidden="true" />
          {label}
        </NavLink>
      ))}
      <div className="mt-auto border-t border-line pt-3">
        {user && <p className="truncate px-3 pb-2 text-xs text-muted">{user.name}</p>}
        <button
          onClick={logout}
          className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-ink hover:bg-ink/5"
        >
          <FiLogOut className="size-5" aria-hidden="true" />
          Logout
        </button>
      </div>
    </nav>
  );
}

export default function AppLayout() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:shadow"
      >
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-white lg:block print:hidden">
        <p className="px-7 pt-6 text-xl font-bold text-brand-700">SmartSpend</p>
        <div className="h-[calc(100%-3.5rem)]">
          <NavList />
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white px-4 py-2 lg:hidden print:hidden">
        <span className="text-lg font-bold text-brand-700">SmartSpend</span>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="grid size-11 place-items-center rounded-lg hover:bg-ink/5"
        >
          <FiMenu className="size-6" aria-hidden="true" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <div id="mobile-nav" className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-white shadow-xl">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              autoFocus
              className="absolute right-2 top-2 grid size-11 place-items-center rounded-lg hover:bg-ink/5"
            >
              <FiX className="size-6" aria-hidden="true" />
            </button>
            <div className="h-full pt-12">
              <NavList onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}

      <main id="main" tabIndex={-1} className="lg:pl-64 print:pl-0">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Suspense fallback={<Spinner />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
