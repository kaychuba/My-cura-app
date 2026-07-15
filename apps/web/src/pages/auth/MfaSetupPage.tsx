import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Loader2, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '../../services/api.client';
import { useAuthStore } from '../../stores/auth.store';
import { AuthUser } from '@my-cura/shared-types';

/**
 * Mandatory MFA enrollment for administrators, owners and managers. Until it
 * completes, the API refuses this account everything except these endpoints,
 * so there is no "skip" button to offer.
 */
export function MfaSetupPage() {
  const navigate = useNavigate();
  const adoptSession = useAuthStore((s) => s.adoptSession);
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiClient
      .post<{ qrCodeDataUrl: string }>('/auth/2fa/setup', {})
      .then(({ data }) => setQr(data.qrCodeDataUrl))
      .catch(() => toast.error('Could not start 2FA setup — reload the page'));
  }, []);

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast.error('Enter the 6-digit code from your authenticator app');
      return;
    }
    setBusy(true);
    try {
      const { data } = await apiClient.post<{
        success: boolean;
        accessToken: string;
        user: AuthUser;
      }>('/auth/2fa/confirm', { code });
      // Swap in the post-enrollment token — the old one only opened 2FA routes.
      adoptSession(data.accessToken, data.user);
      toast.success('Two-factor authentication enabled');
      navigate('/dashboard');
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(msg ?? 'That code did not match — try again');
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto bg-primary-50 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mb-3">
          <ShieldCheck className="w-6 h-6 text-primary-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Secure your account</h1>
        <p className="text-slate-500 text-sm mt-1">
          Administrator accounts must use two-factor authentication. Scan the QR code with an
          authenticator app (Google Authenticator, 1Password, Authy…), then enter the code it
          shows.
        </p>
      </div>

      <div className="card p-6 flex flex-col items-center gap-4">
        {qr ? (
          <img src={qr} alt="Scan with your authenticator app" className="w-48 h-48" />
        ) : (
          <div className="w-48 h-48 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        )}

        <form onSubmit={confirm} className="w-full space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-500 justify-center">
            <Smartphone className="w-4 h-4" />
            Enter the 6-digit code
          </div>
          <input
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
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {busy ? 'Confirming…' : 'Activate 2FA'}
          </button>
        </form>
      </div>
    </div>
  );
}
