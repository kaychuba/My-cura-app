import { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Shield, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/auth.store';

/** Second step of login for MFA-enrolled accounts: enter the 6-digit TOTP code. */
export function TwoFactorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const verify2FA = useAuthStore((s) => s.verify2FA);
  const partialToken = (location.state as { partialToken?: string } | null)?.partialToken;
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  // No pending login → nothing to verify.
  if (!partialToken) return <Navigate to="/login" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast.error('Enter the 6-digit code from your authenticator app');
      return;
    }
    setBusy(true);
    try {
      await verify2FA(partialToken, code);
      navigate('/dashboard');
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(msg ?? 'Invalid code — try again');
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto space-y-6">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto bg-primary-50 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mb-3">
          <Shield className="w-6 h-6 text-primary-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Two-factor authentication</h1>
        <p className="text-slate-500 text-sm mt-1">
          Enter the 6-digit code from your authenticator app
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <input
          autoFocus
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="000000"
          className="input text-center text-2xl tracking-[0.5em] font-mono"
        />
        <button
          type="submit"
          disabled={busy || code.length !== 6}
          className="w-full btn-primary flex items-center justify-center gap-2 py-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
          {busy ? 'Verifying…' : 'Verify'}
        </button>
      </form>

      <p className="text-center text-xs text-slate-400">
        Lost your device? Ask your agency owner to reset 2FA on your account.
      </p>
    </div>
  );
}
