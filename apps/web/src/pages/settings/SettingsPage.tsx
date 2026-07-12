import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '../../services/api.client';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  country: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  settings: { annualLeaveDays?: number };
}

export function SettingsPage() {
  const qc = useQueryClient();
  const { data: tenant } = useQuery<Tenant>({
    queryKey: ['tenant-current'],
    queryFn: async () => (await apiClient.get('/tenants/current')).data,
  });

  const [name, setName] = useState('');
  const [leaveDays, setLeaveDays] = useState('28');

  useEffect(() => {
    if (tenant) {
      setName(tenant.name);
      setLeaveDays(String(tenant.settings?.annualLeaveDays ?? 28));
    }
  }, [tenant]);

  const save = useMutation({
    mutationFn: () =>
      apiClient.patch('/tenants/current', {
        name: name.trim(),
        settings: { annualLeaveDays: Number(leaveDays) || 28 },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-current'] });
      toast.success('Settings saved');
    },
    onError: () => toast.error('Failed to save settings'),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
          <Settings className="w-5 h-5 text-primary-500" />
        </div>
        <h1 className="page-header">Agency Settings</h1>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="section-header flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary-500" /> Agency
        </h2>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Agency name</label>
          <input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Annual leave entitlement (days/year)
          </label>
          <input className="input w-40" type="number" min="0" max="60" value={leaveDays} onChange={(e) => setLeaveDays(e.target.value)} />
          <p className="text-xs text-slate-400 mt-1">Used for every worker's leave balance.</p>
        </div>
        <div className="pt-2">
          <button className="btn-primary disabled:opacity-50" disabled={save.isPending || !name.trim()} onClick={() => save.mutate()}>
            {save.isPending ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>

      {tenant && (
        <div className="card p-6">
          <h2 className="section-header mb-3">Subscription</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Plan: <span className="font-semibold capitalize">{tenant.subscriptionTier}</span>{' '}
            (<span className="capitalize">{tenant.subscriptionStatus}</span>)
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Billing management arrives with the payments integration.
          </p>
        </div>
      )}
    </div>
  );
}
