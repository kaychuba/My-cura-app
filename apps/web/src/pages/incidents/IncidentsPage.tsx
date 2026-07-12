import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Modal } from '@my-cura/ui-web';
import { apiClient } from '../../services/api.client';

interface Incident {
  id: string;
  type?: string;
  severity?: string;
  description: string;
  actionsTaken?: string;
  reportedAt: string;
  resolvedAt?: string;
  serviceUserId?: string;
}

const SEV_COLOR: Record<string, 'green' | 'amber' | 'red' | 'purple'> = {
  low: 'green', medium: 'amber', high: 'red', critical: 'purple',
};

export function IncidentsPage() {
  const qc = useQueryClient();
  const [resolving, setResolving] = useState<Incident | null>(null);
  const [actions, setActions] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['incidents'],
    queryFn: async () => {
      const { data } = await apiClient.get('/incidents');
      return (Array.isArray(data) ? data : data.data ?? []) as Incident[];
    },
  });

  const resolve = useMutation({
    mutationFn: (p: { id: string; actionsTaken: string }) =>
      apiClient.patch(`/incidents/${p.id}/resolve`, { actionsTaken: p.actionsTaken }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidents'] });
      setResolving(null);
      toast.success('Incident resolved');
    },
    onError: () => toast.error('Failed to resolve'),
  });

  const open = (data ?? []).filter((i) => !i.resolvedAt);
  const closed = (data ?? []).filter((i) => i.resolvedAt);

  const Card = ({ i }: { i: Incident }) => (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {i.severity && (
            <Badge color={SEV_COLOR[i.severity] ?? 'gray'} dot>
              <span className="capitalize">{i.severity}</span>
            </Badge>
          )}
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 capitalize">
            {i.type?.replace(/_/g, ' ') ?? 'Incident'}
          </span>
        </div>
        <span className="text-xs text-slate-400">
          {new Date(i.reportedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300">{i.description}</p>
      {i.resolvedAt ? (
        <p className="text-xs text-green-600 mt-3 flex items-center gap-1.5">
          <CheckCircle className="w-3.5 h-3.5" />
          Resolved {new Date(i.resolvedAt).toLocaleDateString('en-GB')}
          {i.actionsTaken ? ` — ${i.actionsTaken}` : ''}
        </p>
      ) : (
        <button
          className="btn-primary text-sm mt-3"
          onClick={() => { setResolving(i); setActions(''); }}
        >
          Resolve
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h1 className="page-header">Incidents</h1>
          <p className="text-sm text-slate-500">Reported by carers from the app; resolve them here with actions taken.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="card p-10 text-center text-slate-400 text-sm">Loading…</div>
      ) : (
        <>
          <h2 className="section-header">Open ({open.length})</h2>
          {open.length === 0 ? (
            <p className="text-sm text-slate-400">No open incidents 🎉</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{open.map((i) => <Card key={i.id} i={i} />)}</div>
          )}
          {closed.length > 0 && (
            <>
              <h2 className="section-header mt-6">Resolved ({closed.length})</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{closed.slice(0, 10).map((i) => <Card key={i.id} i={i} />)}</div>
            </>
          )}
        </>
      )}

      <Modal
        open={!!resolving}
        onClose={() => setResolving(null)}
        title="Resolve Incident"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setResolving(null)}>Cancel</button>
            <button
              className="btn-primary disabled:opacity-50"
              disabled={!actions.trim() || resolve.isPending}
              onClick={() => resolve.mutate({ id: resolving!.id, actionsTaken: actions.trim() })}
            >
              {resolve.isPending ? 'Saving…' : 'Mark Resolved'}
            </button>
          </div>
        }
      >
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
          Actions taken *
        </label>
        <textarea
          className="input w-full min-h-[100px]"
          placeholder="What was done about this incident?"
          value={actions}
          onChange={(e) => setActions(e.target.value)}
        />
      </Modal>
    </div>
  );
}
