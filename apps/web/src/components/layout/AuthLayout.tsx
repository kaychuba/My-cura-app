import { Outlet, Link } from 'react-router-dom';
import { Logo } from '@my-cura/ui-web';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-2" aria-label="My-Cura home">
            <Logo size="lg" tone="inverted" />
          </Link>
          <p className="text-primary-100 text-sm">Care Management Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-800 rounded-[20px] shadow-2xl p-8">
          <Outlet />
        </div>

        <p className="text-center text-primary-200 text-xs mt-6">
          © {new Date().getFullYear()} My-Cura. All rights reserved.
          <br />
          Secure · GDPR Compliant · HIPAA Ready
        </p>
      </div>
    </div>
  );
}
