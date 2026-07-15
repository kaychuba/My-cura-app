import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '../../services/api.client';
import { useAuthStore } from '../../stores/auth.store';

export function SignupPage() {
  const navigate = useNavigate();
  const adoptSession = useAuthStore((s) => s.adoptSession);
  const [form, setForm] = useState({
    agencyName: '', country: 'UK', firstName: '', lastName: '', email: '', password: '',
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.agencyName.trim() || !form.firstName.trim() || !form.email.trim()) {
      toast.error('Please fill in every field');
      return;
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setBusy(true);
    try {
      const { data } = await apiClient.post('/auth/signup', form);
      adoptSession(data.accessToken, data.user);
      toast.success(`Welcome — ${form.agencyName} is ready`);
      // Agency owners must enroll in MFA before the rest of the app opens up.
      navigate(data.mfaSetupRequired ? '/mfa-setup' : '/dashboard');
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(msg ?? 'Could not create your agency');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto bg-primary-50 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mb-3">
          <Building2 className="w-6 h-6 text-primary-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Start your agency</h1>
        <p className="text-sm text-slate-500 mt-1">
          Your own private My-Cura — free trial, no card needed.
        </p>
      </div>

      <form onSubmit={submit} className="card p-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Agency name</label>
          <input className="input w-full" value={form.agencyName} onChange={(e) => setForm({ ...form, agencyName: e.target.value })} placeholder="e.g. Sunrise Home Care" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Country</label>
          <select className="input w-full" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
            <option value="UK">United Kingdom</option>
            <option value="US">United States</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">First name</label>
            <input className="input w-full" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Last name</label>
            <input className="input w-full" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email</label>
          <input className="input w-full" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Password (8+ characters)</label>
          <input className="input w-full" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <button type="submit" className="btn-primary w-full disabled:opacity-50" disabled={busy}>
          {busy ? 'Creating your agency…' : 'Create my agency'}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="text-primary-500 font-medium hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
