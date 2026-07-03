import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  DollarSign,
  FileText,
  TrendingUp,
  AlertCircle,
  Plus,
  Send,
  CheckCircle,
  XCircle,
  ExternalLink,
  ChevronRight,
  Loader2,
  CreditCard,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiClient } from '../../services/api.client';

// ─── Types ────────────────────────────────────────────────────────────────────

type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void';

interface Invoice {
  id: string;
  invoiceNumber: string;
  serviceUserName: string;
  periodStart: string;
  periodEnd: string;
  total: number;
  currency: string;
  status: InvoiceStatus;
  dueDate: string;
  paidAt?: string;
  sentAt?: string;
  lineItems: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    shiftDate?: string;
  }>;
}

interface KPIs {
  revenueMTD: number;
  revenueYTD: number;
  outstandingTotal: number;
  outstandingCount: number;
  overdueTotal: number;
  overdueCount: number;
  payrollCostMTD: number;
  grossMarginPct: number;
  currency: string;
}

interface ChartPoint {
  month: string;
  revenue: number;
  payrollCost: number;
  margin: number;
}

interface Subscription {
  tier: string;
  status: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  seatsUsed: number;
  seatsLimit: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (amount: number, currency = 'GBP') =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount);

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  void: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 line-through',
};

// ─── Subcomponents ────────────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function GenerateInvoiceModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    serviceUserId: '',
    serviceUserName: '',
    periodStart: '',
    periodEnd: '',
    currency: 'GBP',
    taxRatePct: 0,
    notes: '',
  });

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.post('/finance/invoices/generate', {
        serviceUserId: form.serviceUserId,
        periodStart: form.periodStart,
        periodEnd: form.periodEnd,
        currency: form.currency,
        taxRatePct: form.taxRatePct,
        notes: form.notes || undefined,
      }),
    onSuccess: () => {
      toast.success('Invoice generated');
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Failed to generate invoice');
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Generate Invoice</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="form-label">Service User ID</label>
            <input
              className="form-input"
              placeholder="UUID of service user"
              value={form.serviceUserId}
              onChange={(e) => setForm((f) => ({ ...f, serviceUserId: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Period Start</label>
              <input
                type="date"
                className="form-input"
                value={form.periodStart}
                onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label">Period End</label>
              <input
                type="date"
                className="form-input"
                value={form.periodEnd}
                onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Currency</label>
              <select
                className="form-input"
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              >
                <option value="GBP">GBP £</option>
                <option value="USD">USD $</option>
              </select>
            </div>
            <div>
              <label className="form-label">VAT / Tax %</label>
              <input
                type="number"
                min={0}
                max={100}
                className="form-input"
                value={form.taxRatePct}
                onChange={(e) => setForm((f) => ({ ...f, taxRatePct: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div>
            <label className="form-label">Notes (optional)</label>
            <textarea
              className="form-input resize-none"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} className="btn-ghost flex-1">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.serviceUserId || !form.periodStart || !form.periodEnd}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function OverviewTab({ kpis, chart }: { kpis: KPIs; chart: ChartPoint[] }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Revenue MTD"
          value={fmt(kpis.revenueMTD, kpis.currency)}
          sub={`YTD: ${fmt(kpis.revenueYTD, kpis.currency)}`}
          icon={TrendingUp}
          accent="bg-primary-50 dark:bg-primary-900/30 text-primary-500"
        />
        <KPICard
          label="Outstanding"
          value={fmt(kpis.outstandingTotal, kpis.currency)}
          sub={`${kpis.outstandingCount} invoices`}
          icon={FileText}
          accent="bg-blue-50 dark:bg-blue-900/30 text-blue-500"
        />
        <KPICard
          label="Overdue"
          value={fmt(kpis.overdueTotal, kpis.currency)}
          sub={kpis.overdueCount > 0 ? `${kpis.overdueCount} invoices need attention` : 'None'}
          icon={AlertCircle}
          accent={
            kpis.overdueCount > 0
              ? 'bg-red-50 dark:bg-red-900/30 text-red-500'
              : 'bg-green-50 dark:bg-green-900/30 text-green-500'
          }
        />
        <KPICard
          label="Gross Margin"
          value={`${kpis.grossMarginPct}%`}
          sub={`Payroll cost MTD: ${fmt(kpis.payrollCostMTD, kpis.currency)}`}
          icon={DollarSign}
          accent="bg-secondary-50 dark:bg-secondary-900/30 text-secondary-500"
        />
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
          Revenue vs Payroll Cost (12 months)
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chart} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1E3A5F" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#1E3A5F" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorPayroll" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0D9488" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(value: number, name: string) => [
                fmt(value),
                name === 'revenue' ? 'Revenue' : name === 'payrollCost' ? 'Payroll Cost' : name,
              ]}
            />
            <Legend
              formatter={(value) =>
                value === 'revenue' ? 'Revenue' : value === 'payrollCost' ? 'Payroll Cost' : value
              }
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#1E3A5F"
              strokeWidth={2}
              fill="url(#colorRevenue)"
            />
            <Area
              type="monotone"
              dataKey="payrollCost"
              stroke="#0D9488"
              strokeWidth={2}
              fill="url(#colorPayroll)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function InvoicesTab() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('');
  const [page, setPage] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', statusFilter, page],
    queryFn: () =>
      apiClient
        .get('/finance/invoices', {
          params: { status: statusFilter || undefined, page, limit: 15 },
        })
        .then((r) => r.data),
  });

  const refetch = () => qc.invalidateQueries({ queryKey: ['invoices'] });

  const sendMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/finance/invoices/${id}/send`),
    onSuccess: () => { toast.success('Invoice sent'); refetch(); },
    onError: () => toast.error('Failed to send invoice'),
  });

  const paidMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/finance/invoices/${id}/mark-paid`),
    onSuccess: () => { toast.success('Marked as paid'); refetch(); },
    onError: () => toast.error('Failed to update invoice'),
  });

  const voidMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/finance/invoices/${id}/void`),
    onSuccess: () => { toast.success('Invoice voided'); refetch(); },
    onError: () => toast.error('Failed to void invoice'),
  });

  const invoices: Invoice[] = data?.data ?? [];
  const total: number = data?.total ?? 0;
  const pages: number = data?.pages ?? 1;

  if (selectedInvoice) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedInvoice(null)}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        >
          ← Back to invoices
        </button>
        <div className="card p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {selectedInvoice.invoiceNumber}
              </h2>
              <p className="text-sm text-slate-500">{selectedInvoice.serviceUserName}</p>
              <p className="text-xs text-slate-400 mt-1">
                {selectedInvoice.periodStart} → {selectedInvoice.periodEnd}
              </p>
            </div>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[selectedInvoice.status]}`}
            >
              {selectedInvoice.status}
            </span>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100 dark:border-slate-700">
                  <th className="pb-2">Description</th>
                  <th className="pb-2 text-right">Qty (hrs)</th>
                  <th className="pb-2 text-right">Unit Price</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {selectedInvoice.lineItems.map((li) => (
                  <tr key={li.id}>
                    <td className="py-2 text-slate-700 dark:text-slate-300">{li.description}</td>
                    <td className="py-2 text-right text-slate-500">{li.quantity.toFixed(2)}</td>
                    <td className="py-2 text-right text-slate-500">
                      {fmt(li.unitPrice, selectedInvoice.currency)}
                    </td>
                    <td className="py-2 text-right font-medium text-slate-900 dark:text-white">
                      {fmt(li.total, selectedInvoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 dark:border-slate-600 font-bold">
                  <td colSpan={3} className="pt-3 text-right text-slate-700 dark:text-slate-300">
                    Total
                  </td>
                  <td className="pt-3 text-right text-lg text-slate-900 dark:text-white">
                    {fmt(selectedInvoice.total, selectedInvoice.currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {selectedInvoice.status !== 'void' && selectedInvoice.status !== 'paid' && (
            <div className="flex gap-3 pt-2">
              {selectedInvoice.status === 'draft' && (
                <button
                  onClick={() => {
                    sendMutation.mutate(selectedInvoice.id);
                    setSelectedInvoice((i) => i && { ...i, status: 'sent' });
                  }}
                  className="btn-primary flex items-center gap-2"
                >
                  <Send className="w-4 h-4" /> Send Invoice
                </button>
              )}
              {selectedInvoice.status === 'sent' && (
                <button
                  onClick={() => {
                    paidMutation.mutate(selectedInvoice.id);
                    setSelectedInvoice((i) => i && { ...i, status: 'paid' });
                  }}
                  className="btn-primary flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" /> Mark as Paid
                </button>
              )}
              <button
                onClick={() => {
                  voidMutation.mutate(selectedInvoice.id);
                  setSelectedInvoice(null);
                }}
                className="btn-danger flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" /> Void
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showGenerate && (
        <GenerateInvoiceModal
          onClose={() => setShowGenerate(false)}
          onSuccess={refetch}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {(['', 'draft', 'sent', 'paid', 'overdue', 'void'] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded-lg capitalize font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              {s === '' ? 'All' : s}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowGenerate(true)}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" /> Generate Invoice
        </button>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center p-12 text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No invoices found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr className="text-left text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Service User</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-primary-600 dark:text-primary-400">
                    {inv.invoiceNumber}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                    {inv.serviceUserName}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {inv.periodStart} → {inv.periodEnd}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                    {fmt(inv.total, inv.currency)}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{inv.dueDate}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[inv.status]}`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {inv.status === 'draft' && (
                        <button
                          title="Send"
                          onClick={() => sendMutation.mutate(inv.id)}
                          className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {inv.status === 'sent' && (
                        <button
                          title="Mark paid"
                          onClick={() => paidMutation.mutate(inv.id)}
                          className="p-1.5 rounded-lg text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        title="View detail"
                        onClick={() => setSelectedInvoice(inv)}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>{total} invoices</span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Previous
            </button>
            <span className="px-3 py-1">
              {page} / {pages}
            </span>
            <button
              disabled={page === pages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const PLAN_FEATURES: Record<string, string[]> = {
  starter: ['Up to 10 care workers', 'Basic scheduling', 'GPS clock-in', 'Email support'],
  professional: [
    'Up to 100 care workers',
    'Full MAR module',
    'UK + US payroll engines',
    'Incident management',
    'Priority support',
  ],
  enterprise: [
    'Unlimited care workers',
    'AI care summaries',
    'White-label branding',
    'Custom integrations',
    'Dedicated account manager',
    'SLA guarantee',
  ],
};

function SubscriptionTab() {
  const { data: sub, isLoading } = useQuery<Subscription | null>({
    queryKey: ['subscription'],
    queryFn: () => apiClient.get('/finance/subscription').then((r) => r.data),
  });

  const portalMutation = useMutation({
    mutationFn: () =>
      apiClient
        .post('/finance/subscription/portal', { returnUrl: window.location.href })
        .then((r) => r.data as { url: string }),
    onSuccess: ({ url }) => { window.location.href = url; },
    onError: () => toast.error('Could not open billing portal'),
  });

  const checkoutMutation = useMutation({
    mutationFn: (tier: string) =>
      apiClient
        .post('/finance/subscription/checkout', {
          tier,
          billing: 'monthly',
          successUrl: window.location.href + '?upgraded=1',
          cancelUrl: window.location.href,
        })
        .then((r) => r.data as { url: string }),
    onSuccess: ({ url }) => { window.location.href = url; },
    onError: () => toast.error('Could not start checkout'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const tier = sub?.tier ?? 'starter';
  const features = PLAN_FEATURES[tier] ?? PLAN_FEATURES.starter;

  return (
    <div className="space-y-6">
      {sub ? (
        <div className="card p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="w-5 h-5 text-primary-500" />
                <h3 className="font-semibold text-slate-900 dark:text-white capitalize">
                  {tier} Plan
                </h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    sub.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : sub.status === 'trialing'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {sub.status}
                </span>
              </div>
              {sub.currentPeriodEnd && (
                <p className="text-sm text-slate-500">
                  {sub.cancelAtPeriodEnd ? 'Cancels' : 'Renews'} on{' '}
                  {new Date(sub.currentPeriodEnd).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>
            <button
              onClick={() => portalMutation.mutate()}
              disabled={portalMutation.isPending}
              className="btn-ghost flex items-center gap-2 text-sm"
            >
              {portalMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
              Manage Billing
            </button>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-2">
              <div
                className="bg-primary-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min((sub.seatsUsed / sub.seatsLimit) * 100, 100)}%` }}
              />
            </div>
            <span className="text-xs text-slate-500">
              {sub.seatsUsed} / {sub.seatsLimit} seats
            </span>
          </div>

          <ul className="space-y-1.5">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="card p-6 text-center text-slate-400">
          <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-slate-700 dark:text-slate-300">No active subscription</p>
          <p className="text-sm mt-1">Choose a plan below to get started.</p>
        </div>
      )}

      <h3 className="font-semibold text-slate-900 dark:text-white">Available Plans</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['starter', 'professional', 'enterprise'] as const).map((planTier) => {
          const isCurrent = tier === planTier && !!sub;
          return (
            <div
              key={planTier}
              className={`card p-5 flex flex-col ${
                planTier === 'professional'
                  ? 'border-2 border-primary-500 dark:border-primary-400'
                  : ''
              }`}
            >
              {planTier === 'professional' && (
                <div className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wide mb-2">
                  Most Popular
                </div>
              )}
              <h4 className="font-semibold text-slate-900 dark:text-white capitalize mb-3">
                {planTier}
              </h4>
              <ul className="space-y-1.5 mb-4 flex-1">
                {PLAN_FEATURES[planTier].map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => checkoutMutation.mutate(planTier)}
                disabled={isCurrent || checkoutMutation.isPending}
                className={`w-full py-2 rounded-xl text-sm font-medium transition-colors ${
                  isCurrent
                    ? 'bg-slate-100 text-slate-400 cursor-default dark:bg-slate-700'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {isCurrent ? 'Current plan' : checkoutMutation.isPending ? 'Loading...' : 'Upgrade'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'invoices' | 'subscription';

export function FinancePage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const { data: kpis } = useQuery<KPIs>({
    queryKey: ['finance-kpis'],
    queryFn: () => apiClient.get('/finance/kpis').then((r) => r.data),
    refetchInterval: 60_000,
  });

  const { data: chart = [] } = useQuery<ChartPoint[]>({
    queryKey: ['finance-chart'],
    queryFn: () => apiClient.get('/finance/revenue-chart', { params: { months: 12 } }).then((r) => r.data),
  });

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'subscription', label: 'Subscription' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
          <DollarSign className="w-5 h-5 text-primary-500" />
        </div>
        <div>
          <h1 className="page-header">Finance & Invoicing</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Revenue tracking, invoice management and subscription billing
          </p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && kpis && <OverviewTab kpis={kpis} chart={chart} />}
      {activeTab === 'invoices' && <InvoicesTab />}
      {activeTab === 'subscription' && <SubscriptionTab />}
    </div>
  );
}
