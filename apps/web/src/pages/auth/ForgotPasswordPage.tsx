import { Key } from 'lucide-react';

export function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
          <Key className="w-5 h-5 text-primary-500" />
        </div>
        <h1 className="page-header">Reset Password</h1>
      </div>
      <div className="card p-8 text-center text-slate-400">
        <Key className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium">Reset Password</p>
        <p className="text-sm mt-1">This module is under construction.</p>
      </div>
    </div>
  );
}
