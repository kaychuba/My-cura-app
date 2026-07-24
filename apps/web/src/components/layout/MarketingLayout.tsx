import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ShieldCheck, Lock, Database, FileSearch } from 'lucide-react';
import { Logo } from '@my-cura/ui-web';
import { useAuthStore } from '../../stores/auth.store';

// Section anchors live on the home page; react-router doesn't scroll to
// hashes on its own, so the layout does it after each navigation.
const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/#features', label: 'Features' },
  { to: '/#who-its-for', label: 'Who it’s for' },
  { to: '/pricing', label: 'Pricing' },
];

function ScrollToHash() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);
  return null;
}

const TRUST_BADGES = [
  { icon: Lock, label: 'MFA & encryption' },
  { icon: ShieldCheck, label: 'UK GDPR compliant' },
  { icon: Database, label: 'Tenant data isolation' },
  { icon: FileSearch, label: 'Audit logged' },
];

export function MarketingLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-900">
      <ScrollToHash />
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" aria-label="My-Cura home">
            <Logo size="md" tone="solid" />
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ to, label }) =>
              to.includes('#') ? (
                <Link
                  key={to}
                  to={to}
                  className="px-3 py-2 rounded-lg text-sm font-medium transition-colors text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                >
                  {label}
                </Link>
              ) : (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-primary-600 dark:text-primary-300'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ),
            )}
          </nav>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn-primary text-sm">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn-ghost text-sm">
                  Log in
                </Link>
                {/* OneTouch-style header CTA; mailto until a contact form exists */}
                <a
                  href="mailto:hello@mycura.app?subject=My-Cura%20enquiry"
                  className="btn-primary text-sm whitespace-nowrap"
                >
                  Get in touch
                </a>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-3 gap-10">
          <div className="space-y-3">
            <Logo size="sm" tone="solid" />
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
              Care management software for UK domiciliary care agencies — rostering,
              medication, payroll and compliance in one place.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Product</p>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li><Link to="/" className="hover:text-primary-600 dark:hover:text-primary-300">Home</Link></li>
              <li><Link to="/pricing" className="hover:text-primary-600 dark:hover:text-primary-300">Pricing</Link></li>
              <li><Link to="/login" className="hover:text-primary-600 dark:hover:text-primary-300">Log in</Link></li>
              <li><Link to="/signup" className="hover:text-primary-600 dark:hover:text-primary-300">Start free trial</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Built for trust</p>
            <ul className="space-y-2">
              {TRUST_BADGES.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Icon className="w-4 h-4 text-secondary-500 flex-shrink-0" />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-200 dark:border-slate-700">
          <p className="max-w-6xl mx-auto px-4 sm:px-6 py-4 text-xs text-slate-400">
            © {new Date().getFullYear()} My-Cura. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
