import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard, Play, CheckCircle, Lock, AlertCircle, Users,
  PoundSterling, TrendingUp, Calendar, ChevronRight, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '@my-cura/ui-web';
import { apiClient } from '../../services/api.client';
import { PayrollStatus, Country } from '@my-cura/shared-types';
import { formatCurrency, formatDisplayDate } from '@my-cura/shared-utils';

interface PayrollPeriod {
  id: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  country: Country;
  status: PayrollStatus;
  totalGross?: number;
  totalNet?: number;
  workerCount?: number;
  processedAt?: string;
}

const statusConfig: Record<PayrollStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  [PayrollStatus.DRAFT]: { label: 'Draft', color: 'bg-slate-100 text-slate-600', icon: AlertCircle },
  [PayrollStatus.PROCESSING]: { label: 'Processing', color: 'bg-blue-100 text-blue-600', icon: Loader2 },
  [PayrollStatus.APPROVED]: { label: 'Approved', color: 'bg-green-100 text-green-600', icon: CheckCircle },
  [PayrollStatus.PAID]: { label: 'Paid', color: 'bg-amber-100 text-amber-600', icon: CheckCircle },
  [PayrollStatus.LOCKED]: { label: 'Locked', color: 'bg-slate-100 text-slate-700', icon: Lock },
};

export function PayrollPage() {
  const [showRunModal, setShowRunModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const [runForm, setRunForm] = useState({ periodStart: '', periodEnd: '', payDate: '', country: Country.UK });
  const qc = useQueryClient();

  const { data: periods, isLoading } = useQuery<PayrollPeriod[]>({
    queryKey: ['payroll-periods'],
    queryFn: async () => {
      const { data } = await apiClient.get('/payroll/periods');
      return data;
    },
  });

  const { data: detail } = useQuery({
    queryKey: ['payroll-period', selectedPeriod?.id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/payroll/periods/${selectedPeriod!.id}`);
      return data;
    },
    enabled: !!selectedPeriod,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/payroll/periods/${id}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-periods'] });
      toast.success('Payroll approved');
    },
    onError: () => toast.error('Failed to approve payroll'),
  });

  const lockMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/payroll/periods/${id}/lock`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-periods'] });
      toast.success('Payroll locked');
    },
    onError: () => toast.error('Failed to lock payroll'),
  });

  const runMutation = useMutation({
    mutationFn: (dto: { periodStart: string; periodEnd: string; payDate: string; country: Country }) =>
      apiClient.post('/payroll/run', dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-periods'] });
      setShowRunModal(false);
      toast.success('Payroll run started');
    },
    onError: () => toast.error('Failed to start payroll run'),
  });

  const totalGross = periods?.reduce((s, p) => s + (p.totalGross ?? 0), 0) ?? 0;
  const totalNet = periods?.reduce((s, p) => s + (p.totalNet ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-primary-500" />
          </div>
          <h1 className="page-header">Payroll</h1>
        </div>
        <button
          className="btn-primary flex items-center gap-2"
          onClick={() => setShowRunModal(true)}
        >
          <Play className="w-4 h-4" />
          Run Payroll
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center mb-3">
            <PoundSterling className="w-4 h-4 text-primary-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalGross, 'GBP')}</div>
          <div className="text-sm text-slate-500 mt-0.5">Total Gross (all runs)</div>
        </div>
        <div className="stat-card">
          <div className="w-9 h-9 bg-secondary-50 rounded-lg flex items-center justify-center mb-3">
            <TrendingUp className="w-4 h-4 text-secondary-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalNet, 'GBP')}</div>
          <div className="text-sm text-slate-500 mt-0.5">Total Net Pay</div>
        </div>
        <div className="stat-card">
          <div className="w-9 h-9 bg-accent-50 rounded-lg flex items-center justify-center mb-3">
            <Users className="w-4 h-4 text-accent-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {periods?.[0]?.workerCount ?? '—'}
          </div>
          <div className="text-sm text-slate-500 mt-0.5">Workers in Latest Run</div>
        </div>
      </div>

      {/* Periods list */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="section-header">Payroll Periods</h2>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading payroll periods...
          </div>
        ) : !periods?.length ? (
          <div className="p-8 text-center text-slate-400">
            <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No payroll runs yet. Click "Run Payroll" to start.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {periods.map((period) => {
              const cfg = statusConfig[period.status];
              const Icon = cfg.icon;
              return (
                <button
                  key={period.id}
                  className="w-full px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left flex items-center gap-4"
                  onClick={() => setSelectedPeriod(period)}
                >
                  <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 text-primary-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {formatDisplayDate(period.periodStart)} – {formatDisplayDate(period.periodEnd)}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
                        <Icon className={`w-3 h-3 ${period.status === PayrollStatus.PROCESSING ? 'animate-spin' : ''}`} />
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>Pay date: {formatDisplayDate(period.payDate)}</span>
                      {period.workerCount !== undefined && <span>{period.workerCount} workers</span>}
                      {period.totalGross !== undefined && (
                        <span>Gross: {formatCurrency(period.totalGross, period.country === Country.UK ? 'GBP' : 'USD')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {period.status === PayrollStatus.DRAFT && (
                      <button
                        className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-green-600"
                        onClick={(e) => { e.stopPropagation(); approveMutation.mutate(period.id); }}
                      >
                        Approve
                      </button>
                    )}
                    {period.status === PayrollStatus.APPROVED && (
                      <button
                        className="text-xs bg-slate-700 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-slate-800"
                        onClick={(e) => { e.stopPropagation(); lockMutation.mutate(period.id); }}
                      >
                        Lock
                      </button>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Period detail panel */}
      {selectedPeriod && detail && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-header">
              Period Detail — {formatDisplayDate(selectedPeriod.periodStart)} to {formatDisplayDate(selectedPeriod.periodEnd)}
            </h2>
            <button className="text-sm text-slate-400 hover:text-slate-600" onClick={() => setSelectedPeriod(null)}>
              Close
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Gross', value: formatCurrency(detail.totalGross, 'GBP') },
              { label: 'Total Net', value: formatCurrency(detail.totalNet, 'GBP') },
              { label: 'Total Tax', value: formatCurrency(detail.totalTax, 'GBP') },
              { label: 'Total NI', value: formatCurrency(detail.totalNI, 'GBP') },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-1">{label}</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">{value}</div>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  {['Worker', 'Gross Pay', 'Tax', 'NI (EE)', 'Pension', 'Net Pay'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
                {detail.records?.map((rec: {
                  id: string;
                  careWorkerId: string;
                  grossPay: number;
                  payeTax: number;
                  employeeNI: number;
                  employeePension: number;
                  netPay: number;
                }) => (
                  <tr key={rec.id}>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-mono text-xs">{rec.careWorkerId.slice(0, 8)}</td>
                    <td className="px-4 py-3">{formatCurrency(rec.grossPay, 'GBP')}</td>
                    <td className="px-4 py-3">{formatCurrency(rec.payeTax ?? 0, 'GBP')}</td>
                    <td className="px-4 py-3">{formatCurrency(rec.employeeNI ?? 0, 'GBP')}</td>
                    <td className="px-4 py-3">{formatCurrency(rec.employeePension ?? 0, 'GBP')}</td>
                    <td className="px-4 py-3 font-semibold text-green-600">{formatCurrency(rec.netPay, 'GBP')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Run payroll modal */}
      <Modal
        open={showRunModal}
        onClose={() => setShowRunModal(false)}
        title="Run Payroll"
        footer={
          <div className="flex justify-end gap-2">
            <button className="text-sm text-slate-500 px-4 py-2 rounded-lg hover:bg-slate-100" onClick={() => setShowRunModal(false)}>
              Cancel
            </button>
            <button
              className="btn-primary text-sm"
              disabled={!runForm.periodStart || !runForm.periodEnd || !runForm.payDate || runMutation.isPending}
              onClick={() => runMutation.mutate(runForm)}
            >
              {runMutation.isPending ? 'Starting…' : 'Start Run'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {[
            { label: 'Period Start', key: 'periodStart' as const },
            { label: 'Period End', key: 'periodEnd' as const },
            { label: 'Pay Date', key: 'payDate' as const },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
              <input
                type="date"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={runForm[key]}
                onChange={(e) => setRunForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Country</label>
            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={runForm.country}
              onChange={(e) => setRunForm((f) => ({ ...f, country: e.target.value as Country }))}
            >
              <option value={Country.UK}>United Kingdom</option>
              <option value={Country.US}>United States</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
