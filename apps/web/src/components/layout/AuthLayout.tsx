import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <span className="text-3xl font-bold text-white tracking-tight">My-Cura</span>
          </div>
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
