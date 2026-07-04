import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen, Plus, Link as LinkIcon, FileText, CheckCircle,
  Clock, Archive, ExternalLink, Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '@my-cura/ui-web';
import { apiClient } from '../../services/api.client';
import { formatDisplayDate } from '@my-cura/shared-utils';

interface Policy {
  id: string;
  title: string;
  summary?: string;
  content?: string;
  externalUrl?: string;
  publishedAt: string;
  requiresAcknowledgement: boolean;
}

interface Quota {
  limit: number;
  used: number;
  remaining: number;
}

interface AckStatus {
  policyId: string;
  acknowledgedCount: number;
  totalStaff: number;
  acknowledged: { id: string; name: string; role: string; acknowledgedAt: string }[];
  pending: { id: string; name: string; role: string }[];
}

const emptyForm = {
  title: '',
  summary: '',
  mode: 'content' as 'content' | 'link',
  content: '',
  externalUrl: '',
  requiresAcknowledgement: true,
};

export function PoliciesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Policy | null>(null);
  const [form, setForm] = useState(emptyForm);
  const qc = useQueryClient();

  const { data: policies, isLoading } = useQuery<Policy[]>({
    queryKey: ['policies'],
    queryFn: async () => (await apiClient.get('/policies')).data,
  });

  const { data: quota } = useQuery<Quota>({
    queryKey: ['policies-quota'],
    queryFn: async () => (await apiClient.get('/policies/quota')).data,
  });

  const { data: ackStatus } = useQuery<AckStatus>({
    queryKey: ['policy-acks', selected?.id],
    queryFn: async () => (await apiClient.get(`/policies/${selected!.id}/acknowledgements`)).data,
    enabled: !!selected,
  });

  const createMutation = useMutation({
    mutationFn: (dto: {
      title: string; summary?: string; content?: string;
      externalUrl?: string; requiresAcknowledgement: boolean;
    }) => apiClient.post('/policies', dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['policies'] });
      qc.invalidateQueries({ queryKey: ['policies-quota'] });
      setShowCreate(false);
      setForm(emptyForm);
      toast.success('Policy published — care workers will see it in their app');
    },
    onError: (err: { response?: { status?: number; data?: { message?: string } } }) => {
      toast.error(
        err.response?.status === 409
          ? err.response.data?.message ?? 'Monthly policy limit reached'
          : 'Failed to publish policy',
      );
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/policies/${id}/archive`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['policies'] });
      setSelected(null);
      toast.success('Policy archived');
    },
    onError: () => toast.error('Failed to archive policy'),
  });

  const submitCreate = () => {
    if (!form.title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (form.mode === 'content' && !form.content.trim()) {
      toast.error('Please write the policy content');
      return;
    }
    if (form.mode === 'link' && !/^https?:\/\//.test(form.externalUrl.trim())) {
      toast.error('Please enter a valid link starting with http:// or https://');
      return;
    }

    createMutation.mutate({
      title: form.title.trim(),
      summary: form.summary.trim() || undefined,
      content: form.mode === 'content' ? form.content.trim() : undefined,
      externalUrl: form.mode === 'link' ? form.externalUrl.trim() : undefined,
      requiresAcknowledgement: form.requiresAcknowledgement,
    });
  };

  const quotaReached = quota ? quota.remaining === 0 : false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary-500" />
          </div>
          <h1 className="page-header">Company Policies</h1>
        </div>
        <button
          className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => setShowCreate(true)}
          disabled={quotaReached}
          title={quotaReached ? 'Monthly limit reached — you can publish again next month' : undefined}
        >
          <Plus className="w-4 h-4" />
          Publish Policy
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center mb-3">
            <Clock className="w-4 h-4 text-primary-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {quota ? `${quota.used} / ${quota.limit}` : '—'}
          </div>
          <div className="text-sm text-slate-500 mt-0.5">Published this month</div>
          {quota && (
            <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${quotaReached ? 'bg-red-400' : 'bg-secondary-400'}`}
                style={{ width: `${(quota.used / quota.limit) * 100}%` }}
              />
            </div>
          )}
        </div>
        <div className="stat-card">
          <div className="w-9 h-9 bg-secondary-50 rounded-lg flex items-center justify-center mb-3">
            <FileText className="w-4 h-4 text-secondary-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{policies?.length ?? '—'}</div>
          <div className="text-sm text-slate-500 mt-0.5">Active policies</div>
        </div>
        <div className="stat-card">
          <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center mb-3">
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {quota ? quota.remaining : '—'}
          </div>
          <div className="text-sm text-slate-500 mt-0.5">Publishes left this month</div>
        </div>
      </div>

      {quotaReached && (
        <div className="card bg-amber-50 border border-amber-200 text-sm text-amber-800 p-4">
          You&apos;ve published {quota!.limit} policies this month — the limit that keeps
          reading manageable for care workers. You can publish again on the 1st.
        </div>
      )}

      {/* Policy list */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading policies...</div>
        ) : !policies?.length ? (
          <div className="p-10 text-center">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              No policies yet. Publish your first policy and every care worker will see
              it in their app.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {policies.map((policy) => (
              <li key={policy.id}>
                <button
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                  onClick={() => setSelected(policy)}
                >
                  <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    {policy.externalUrl
                      ? <LinkIcon className="w-4 h-4 text-primary-500" />
                      : <FileText className="w-4 h-4 text-primary-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{policy.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Published {formatDisplayDate(policy.publishedAt)}
                      {policy.externalUrl ? ' · external link' : ' · written in-app'}
                      {!policy.requiresAcknowledgement && ' · info only'}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-primary-500">View readers →</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Create modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Publish a Policy"
        size="lg"
        footer={
          <div className="flex justify-between items-center w-full">
            <span className="text-xs text-slate-500">
              {quota ? `${quota.remaining} of ${quota.limit} publishes left this month` : ''}
            </span>
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button
                className="btn-primary disabled:opacity-50"
                onClick={submitCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
            <input
              className="input w-full"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Infection Control Policy"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Short summary</label>
            <input
              className="input w-full"
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              placeholder="One sentence shown in the care worker's app"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Policy source *</label>
            <div className="flex gap-2">
              <button
                type="button"
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                  form.mode === 'content'
                    ? 'border-primary-500 bg-primary-50 text-primary-600'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
                onClick={() => setForm({ ...form, mode: 'content' })}
              >
                <FileText className="w-4 h-4" /> Write it here
              </button>
              <button
                type="button"
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                  form.mode === 'link'
                    ? 'border-primary-500 bg-primary-50 text-primary-600'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
                onClick={() => setForm({ ...form, mode: 'link' })}
              >
                <LinkIcon className="w-4 h-4" /> Link to a document
              </button>
            </div>
          </div>

          {form.mode === 'content' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Policy content *</label>
              <textarea
                className="input w-full min-h-[180px]"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Paste or write the full policy text here..."
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Link to policy *</label>
              <input
                className="input w-full"
                value={form.externalUrl}
                onChange={(e) => setForm({ ...form, externalUrl: e.target.value })}
                placeholder="https://your-agency.co.uk/policies/infection-control.pdf"
              />
              <p className="text-xs text-slate-500 mt-1">
                Care workers will be taken to this link to read the policy.
              </p>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="rounded border-slate-300"
              checked={form.requiresAcknowledgement}
              onChange={(e) => setForm({ ...form, requiresAcknowledgement: e.target.checked })}
            />
            Require care workers to confirm they have read it
          </label>
        </div>
      </Modal>

      {/* Detail / acknowledgements modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title ?? ''}
        size="lg"
        footer={
          <div className="flex justify-between items-center w-full">
            <button
              className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700"
              onClick={() => {
                if (window.confirm('Archive this policy? Care workers will no longer see it.')) {
                  archiveMutation.mutate(selected!.id);
                }
              }}
            >
              <Archive className="w-4 h-4" /> Archive
            </button>
            <button className="btn-secondary" onClick={() => setSelected(null)}>Close</button>
          </div>
        }
      >
        {selected && (
          <div className="space-y-5">
            <p className="text-xs text-slate-500">
              Published {formatDisplayDate(selected.publishedAt)}
            </p>
            {selected.summary && <p className="text-sm text-slate-600 italic">{selected.summary}</p>}
            {selected.externalUrl && (
              <a
                href={selected.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-500 hover:underline"
              >
                <ExternalLink className="w-4 h-4" /> Open linked document
              </a>
            )}
            {selected.content && (
              <div className="max-h-48 overflow-y-auto rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700 whitespace-pre-wrap">
                {selected.content}
              </div>
            )}

            {selected.requiresAcknowledgement && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-900">Who has read it</h3>
                  {ackStatus && (
                    <span className="text-xs font-medium text-slate-500">
                      {ackStatus.acknowledgedCount} of {ackStatus.totalStaff} staff
                    </span>
                  )}
                </div>
                {!ackStatus ? (
                  <p className="text-sm text-slate-400">Loading...</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                      <p className="text-xs font-semibold text-emerald-700 mb-2 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Confirmed ({ackStatus.acknowledged.length})
                      </p>
                      <ul className="space-y-1 max-h-40 overflow-y-auto">
                        {ackStatus.acknowledged.map((u) => (
                          <li key={u.id} className="text-xs text-slate-700 flex justify-between gap-2">
                            <span className="truncate">{u.name}</span>
                            <span className="text-slate-400 flex-shrink-0">
                              {formatDisplayDate(u.acknowledgedAt)}
                            </span>
                          </li>
                        ))}
                        {!ackStatus.acknowledged.length && (
                          <li className="text-xs text-slate-400">No one yet</li>
                        )}
                      </ul>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                      <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Not yet read ({ackStatus.pending.length})
                      </p>
                      <ul className="space-y-1 max-h-40 overflow-y-auto">
                        {ackStatus.pending.map((u) => (
                          <li key={u.id} className="text-xs text-slate-700 flex justify-between gap-2">
                            <span className="truncate">{u.name}</span>
                            <span className="text-slate-400 capitalize flex-shrink-0">
                              {u.role.replace(/_/g, ' ')}
                            </span>
                          </li>
                        ))}
                        {!ackStatus.pending.length && (
                          <li className="text-xs text-slate-400">Everyone has read it 🎉</li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
