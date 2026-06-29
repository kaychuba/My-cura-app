import { useState } from 'react';
import {
  FileText, Clock, Pill, AlertTriangle, Heart,
  ShieldCheck, GraduationCap, Download, ChevronDown, Loader2, X,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../services/api.client';

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportFormat = 'xlsx' | 'csv';

interface ReportType {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  endpoint: string;
  params: ParamDef[];
}

interface ParamDef {
  key: string;
  label: string;
  type: 'date' | 'number' | 'select';
  required?: boolean;
  defaultValue?: string | number;
  options?: { label: string; value: string }[];
}

// ─── Report catalogue ─────────────────────────────────────────────────────────

const REPORTS: ReportType[] = [
  {
    id: 'payroll',
    title: 'Payroll Report',
    description: 'Gross pay, income tax, NI, pension and net pay per worker for a date range.',
    icon: FileText,
    color: 'bg-primary-50 dark:bg-primary-900/30 text-primary-500',
    endpoint: '/reports/payroll',
    params: [
      { key: 'from', label: 'Period Start', type: 'date', required: true },
      { key: 'to', label: 'Period End', type: 'date', required: true },
    ],
  },
  {
    id: 'timesheet',
    title: 'Timesheet & Attendance',
    description: 'Scheduled vs actual hours worked per shift, with clock-in/out times and statuses.',
    icon: Clock,
    color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-500',
    endpoint: '/reports/timesheet',
    params: [
      { key: 'from', label: 'From Date', type: 'date', required: true },
      { key: 'to', label: 'To Date', type: 'date', required: true },
    ],
  },
  {
    id: 'mar-compliance',
    title: 'MAR Compliance',
    description: 'Medication given, refused, and omitted counts with compliance % per service user.',
    icon: Pill,
    color: 'bg-secondary-50 dark:bg-secondary-900/30 text-secondary-500',
    endpoint: '/reports/mar-compliance',
    params: [
      { key: 'from', label: 'From Date', type: 'date', required: true },
      { key: 'to', label: 'To Date', type: 'date', required: true },
    ],
  },
  {
    id: 'incidents',
    title: 'Incident Report',
    description: 'Full incident log with type, severity, actions taken and CQC-reportable flags.',
    icon: AlertTriangle,
    color: 'bg-red-50 dark:bg-red-900/30 text-red-500',
    endpoint: '/reports/incidents',
    params: [
      { key: 'from', label: 'From Date', type: 'date', required: true },
      { key: 'to', label: 'To Date', type: 'date', required: true },
      {
        key: 'severity',
        label: 'Severity (optional)',
        type: 'select',
        options: [
          { label: 'All', value: '' },
          { label: 'Low', value: 'low' },
          { label: 'Medium', value: 'medium' },
          { label: 'High', value: 'high' },
          { label: 'Critical', value: 'critical' },
        ],
      },
    ],
  },
  {
    id: 'care-hours',
    title: 'Care Hours',
    description: 'Total care hours delivered per service user, broken down by shift type.',
    icon: Heart,
    color: 'bg-pink-50 dark:bg-pink-900/30 text-pink-500',
    endpoint: '/reports/care-hours',
    params: [
      { key: 'from', label: 'From Date', type: 'date', required: true },
      { key: 'to', label: 'To Date', type: 'date', required: true },
    ],
  },
  {
    id: 'document-expiry',
    title: 'Document Expiry',
    description: 'DBS checks, passports, visas and other documents expiring within N days.',
    icon: ShieldCheck,
    color: 'bg-amber-50 dark:bg-amber-900/30 text-amber-500',
    endpoint: '/reports/document-expiry',
    params: [
      {
        key: 'daysAhead',
        label: 'Days Ahead',
        type: 'number',
        required: true,
        defaultValue: 30,
      },
    ],
  },
  {
    id: 'training-compliance',
    title: 'Training Compliance',
    description: 'Who has completed required training, validity status and expiry dates.',
    icon: GraduationCap,
    color: 'bg-purple-50 dark:bg-purple-900/30 text-purple-500',
    endpoint: '/reports/training-compliance',
    params: [],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function defaultParams(report: ReportType): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  const today = new Date().toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 86400_000).toISOString().split('T')[0];
  report.params.forEach((p) => {
    if (p.defaultValue !== undefined) {
      out[p.key] = p.defaultValue;
    } else if (p.type === 'date') {
      out[p.key] = p.key === 'from' ? monthAgo : today;
    } else if (p.type === 'select') {
      out[p.key] = p.options?.[0]?.value ?? '';
    }
  });
  return out;
}

async function triggerDownload(
  endpoint: string,
  params: Record<string, string | number>,
  format: ReportFormat,
  filename: string,
) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== '' && v !== undefined) qs.set(k, String(v));
  });
  qs.set('format', format);

  const response = await api.get(`${endpoint}?${qs.toString()}`, {
    responseType: 'blob',
  });

  const ext = format === 'xlsx' ? 'xlsx' : 'csv';
  const url = URL.createObjectURL(response.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Config panel ─────────────────────────────────────────────────────────────

function ConfigPanel({
  report,
  onClose,
}: {
  report: ReportType;
  onClose: () => void;
}) {
  const [params, setParams] = useState<Record<string, string | number>>(defaultParams(report));
  const [format, setFormat] = useState<ReportFormat>('xlsx');
  const [loading, setLoading] = useState(false);

  const set = (key: string, val: string | number) =>
    setParams((p) => ({ ...p, [key]: val }));

  const download = async () => {
    setLoading(true);
    try {
      await triggerDownload(report.endpoint, params, format, report.id);
      toast.success(`${report.title} downloaded`);
    } catch (err: any) {
      const msg = err?.response?.status === 400
        ? 'No data found for the selected filters'
        : 'Failed to generate report';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const canDownload = report.params
    .filter((p) => p.required)
    .every((p) => params[p.key] !== '' && params[p.key] !== undefined);

  return (
    <div className="card p-5 border border-primary-200 dark:border-primary-700 bg-primary-50/40 dark:bg-primary-900/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${report.color}`}>
            <report.icon className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{report.title}</h3>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {report.params.map((p) => (
          <div key={p.key}>
            <label className="form-label text-xs">
              {p.label}
              {p.required && <span className="text-red-400 ml-0.5">*</span>}
            </label>
            {p.type === 'date' && (
              <input
                type="date"
                className="form-input text-sm"
                value={params[p.key] as string}
                onChange={(e) => set(p.key, e.target.value)}
              />
            )}
            {p.type === 'number' && (
              <input
                type="number"
                min={1}
                max={365}
                className="form-input text-sm"
                value={params[p.key] as number}
                onChange={(e) => set(p.key, Number(e.target.value))}
              />
            )}
            {p.type === 'select' && (
              <select
                className="form-input text-sm"
                value={params[p.key] as string}
                onChange={(e) => set(p.key, e.target.value)}
              >
                {p.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}

        {/* Format picker */}
        <div>
          <label className="form-label text-xs">Format</label>
          <div className="flex gap-2">
            {(['xlsx', 'csv'] as ReportFormat[]).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors uppercase ${
                  format === f
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={download}
        disabled={loading || !canDownload}
        className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        {loading ? 'Generating…' : `Download ${format.toUpperCase()}`}
      </button>
    </div>
  );
}

// ─── Report card ──────────────────────────────────────────────────────────────

function ReportCard({
  report,
  isSelected,
  onSelect,
}: {
  report: ReportType;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`card p-5 text-left transition-all hover:shadow-md flex flex-col gap-3 ${
        isSelected
          ? 'border-2 border-primary-500 dark:border-primary-400'
          : 'border border-transparent'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${report.color}`}>
          <report.icon className="w-5 h-5" />
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${
            isSelected ? 'rotate-180 text-primary-500' : ''
          }`}
        />
      </div>
      <div>
        <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">
          {report.title}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {report.description}
        </p>
      </div>
      <div className="flex items-center gap-1.5 mt-auto">
        <span className="text-xs px-2 py-0.5 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium">
          XLSX
        </span>
        <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 font-medium">
          CSV
        </span>
      </div>
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ReportsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedReport = REPORTS.find((r) => r.id === selectedId) ?? null;

  const toggle = (id: string) =>
    setSelectedId((cur) => (cur === id ? null : id));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
          <FileText className="w-5 h-5 text-primary-500" />
        </div>
        <div>
          <h1 className="page-header">Reports</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Download compliance, operational and financial reports as XLSX or CSV
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {REPORTS.map((report) => (
          <ReportCard
            key={report.id}
            report={report}
            isSelected={selectedId === report.id}
            onSelect={() => toggle(report.id)}
          />
        ))}
      </div>

      {selectedReport && (
        <ConfigPanel
          key={selectedReport.id}
          report={selectedReport}
          onClose={() => setSelectedId(null)}
        />
      )}

      <div className="card p-4 bg-slate-50 dark:bg-slate-800/50">
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Reports are generated on demand from live data. XLSX files include formatted headers, conditional colour coding, and auto-sized columns. All reports are restricted to your agency's data only.
        </p>
      </div>
    </div>
  );
}
