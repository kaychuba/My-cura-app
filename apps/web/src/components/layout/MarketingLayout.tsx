import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ShieldCheck, Lock, Database, FileSearch, ChevronDown } from 'lucide-react';
import { Logo } from '@my-cura/ui-web';
import { useAuthStore } from '../../stores/auth.store';
import { FEATURES, CARE_SETTINGS } from '../../pages/marketing/marketingData';

// Section anchors live on the home page; react-router doesn't scroll to
// hashes on its own, so the layout does it after each navigation.
function ScrollToHash() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    // rAF: make sure the destination page has committed before we look for
    // the anchor (matters when navigating from /pricing or /contact).
    requestAnimationFrame(() => {
      if (hash) {
        document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo(0, 0);
      }
    });
  }, [pathname, hash]);
  return null;
}

/**
 * OneTouch-style dropdown: each item deep-links to its dedicated tab on the
 * home page (`/#feature-<slug>`), which scrolls to the section and switches
 * the tab — same page, no reload.
 */
function NavDropdown({
  label,
  items,
}: {
  label: string;
  items: { slug: string; title: string }[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Close on route/hash change and on clicks outside.
  useEffect(() => setOpen(false), [location]);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
      >
        {label}
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-1 w-64 card p-2 shadow-modal z-50"
        >
          {items.map((item) => (
            <Link
              key={item.slug}
              role="menuitem"
              to={`/#${label === 'Features' ? 'feature' : 'setting'}-${item.slug}`}
              className="block px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
            >
              {item.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
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
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-primary-600 dark:text-primary-300'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`
              }
            >
              Home
            </NavLink>
            <NavDropdown label="Features" items={FEATURES} />
            <NavDropdown label="Who it’s for" items={CARE_SETTINGS} />
            <NavLink
              to="/pricing"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-primary-600 dark:text-primary-300'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`
              }
            >
              Pricing
            </NavLink>
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
                <Link to="/contact" className="btn-primary text-sm whitespace-nowrap">
                  Get in touch
                </Link>
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
              <li><Link to="/contact" className="hover:text-primary-600 dark:hover:text-primary-300">Get in touch</Link></li>
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
