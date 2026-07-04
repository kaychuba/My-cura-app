import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldAlert, UserX, User, Inbox, Search, FolderSearch, CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '@my-cura/ui-web';
import { apiClient } from '../../services/api.client';
import { useAuthStore } from '../../stores/auth.store';
import { UserRole } from '@my-cura/shared-types';
import { formatDisplayDate } from '@my-cura/shared-utils';

type ReportStatus = 'submitted' | 'under_review' | 'investigating' | 'closed';

interface Report {
  id: string;
  category: string;
  description: string;
  context?: string;
  status: ReportStatus;
  reporterName: string | null;
  reviewNotes?: string;
  createdAt: string;
  closedAt?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  abuse_or_neglect: 'Abuse or Neglect',
  medication_practice: 'Medication Practice',
  health_and_safety: 'Health & Safety',
  fraud_or_theft: 'Fraud or Theft',
  management_conduct: 'Management Conduct',
  discrimination: 'Discrimination',
  other: 'Other',
};

const STATUS_CONFIG: Record<ReportStatus, { label: string; badge: string; icon: typeof Inbox }> = {
  submitted: { label: 'New', badge: 'badge-blue', icon: Inbox },
  under_review: { label: 'Under Review', badge: 'badge-amber', icon: Search },
  investigating: { label: 'Investigating', badge: 'badge-teal', icon: FolderSearch },
  closed: { label: 'Closed', badge: 'badge-green', icon: CheckCircle2 },
};

const STATUS_FLOW: ReportStatus[] = ['submitted', 'under_review', 'investigating', 'closed'];

export function WhistleblowingPage() {
  const { user } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [selected, setSelected] = useState<Report | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const qc = useQueryClient();

  const isOwner =
    user?.role === UserRole.AGENCY_OWNER || user?.role === UserRole.SUPER_ADMIN;

  const { data, isLoading } = useQuery<{ data: Report[]; total: number }>({
    queryKey: ['whistleblowing', statusFilter],
    queryFn: async () =>
      (await apiClient.get('/whistleblowing', {
        params: statusFilter === 'all' ? { limit: 100 } : { status: statusFilter, limit: 100 },
      })).data,
    enabled: isOwner,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: ReportStatus; notes: string }) =>
      apiClient.patch(`/whistleblowing/${id}/status`, {
        status,
        reviewNotes: notes.trim() || undefined,
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['whistleblowing'] });
      setSelected(null);
      setReviewNotes('');
      toast.success(`Report moved to "${STATUS_CONFIG[vars.status].label}"`);
    },
    onError: () => toast.error('Failed to update the report'),
  });

  // The API already refuses non-owners (403); this gate just explains why.
  if (!isOwner) {
    return (
      <div className="card p-10 text-center max-w-lg mx-auto mt-12">
        <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto mb-3" />
        <h1 className="text-lg font-semibold text-slate-900">Restricted to the agency owner</h1>
        <p className="text-sm text-slate-500 mt-2">
          Whistleblowing reports are confidential. To protect the people who speak up,
          only the agency owner can read and manage them.
        </p>
      </div>
    );
  }

  const reports = data?.data ?? [];
  const openCount = reports.filter((r) => r.status !== 'closed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-primary-500" />
          </div>
          <div>
            <h1 className="page-header">Whistleblowing</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Confidential reports — visible only to you
            </p>
          </div>
        </div>
        {openCount > 0 && (
          <span className="badge-amber px-3 py-1.5 text-sm font-semibold rounded-full">
            {openCount} open
          </span>
        )}
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {(['all', ...STATUS_FLOW] as const).map((s) => (
          <button
            key={s}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              statusFilter === s
                ? 'bg-primary-500 text-white border-primary-500'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
            onClick={() => setStatusFilter(s)}
          >
            {s === 'all' ? 'All' : STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>

      {/* Report list */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading reports...</div>
        ) : !reports.length ? (
          <div className="p-10 text-center">
            <Inbox className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              No {statusFilter === 'all' ? '' : STATUS_CONFIG[statusFilter as ReportStatus].label.toLowerCase() + ' '}
              reports. When a care worker speaks up, it will appear here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {reports.map((report) => {
              const cfg = STATUS_CONFIG[report.status];
              return (
                <li key={report.id}>
                  <button
                    className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                    onClick={() => { setSelected(report); setReviewNotes(report.reviewNotes ?? ''); }}
                  >
                    <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                      {report.reporterName
                        ? <User className="w-4 h-4 text-slate-500" />
                        : <UserX className="w-4 h-4 text-slate-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900">
                          {CATEGORY_LABELS[report.category] ?? report.category}
                        </p>
                        <span className={`${cfg.badge} text-xs px-2 py-0.5 rounded-full font-medium`}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{report.description}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-slate-500">{formatDisplayDate(report.createdAt)}</p>
                      <p className="text-xs font-medium mt-0.5 text-slate-400">
                        {report.reporterName ?? 'Anonymous'}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Detail modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? (CATEGORY_LABELS[selected.category] ?? selected.category) : ''}
        size="lg"
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selected.reporterName ? (
                  <>
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-700">
                      Reported by <strong>{selected.reporterName}</strong>
                    </span>
                  </>
                ) : (
                  <>
                    <UserX className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-500">
                      Anonymous — no identity was recorded
                    </span>
                  </>
                )}
              </div>
              <span className="text-xs text-slate-400">
                Ref {selected.id.slice(0, 8).toUpperCase()} · {formatDisplayDate(selected.createdAt)}
              </span>
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">The concern</p>
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{selected.description}</p>
              {selected.context && (
                <>
                  <p className="text-xs font-semibold text-slate-500 uppercase mt-3 mb-1">
                    When / where / who
                  </p>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap">{selected.context}</p>
                </>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Your review notes
              </label>
              <textarea
                className="input w-full min-h-[90px]"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="What you have looked into, decisions made, actions taken..."
              />
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Move to</p>
              <div className="flex flex-wrap gap-2">
                {STATUS_FLOW.filter((s) => s !== selected.status).map((s) => {
                  const cfg = STATUS_CONFIG[s];
                  return (
                    <button
                      key={s}
                      className="btn-secondary flex items-center gap-1.5 text-sm disabled:opacity-50"
                      disabled={statusMutation.isPending}
                      onClick={() =>
                        statusMutation.mutate({ id: selected.id, status: s, notes: reviewNotes })
                      }
                    >
                      <cfg.icon className="w-4 h-4" />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Review notes are saved whenever you change the status.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
