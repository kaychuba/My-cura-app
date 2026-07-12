import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge } from '@my-cura/ui-web';
import { apiClient } from '../../services/api.client';
import { formatDisplayDate } from '@my-cura/shared-utils';

interface Expense {
  id: string;
  careWorkerId: string;
  category: string;
  description: string;
  amount: string;
  expenseDate: string;
  status: 'submitted' | 'approved' | 'rejected' | 'paid';
  reviewNote?: string;
}

const STATUS_COLOR: Record<string, 'amber' | 'green' | 'red' | 'purple'> = {
  submitted: 'amber', approved: 'green', rejected: 'red', paid: 'purple',
};

export function ExpensesPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'submitted' | 'approved' | 'all'>('submitted');

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', filter],
    queryFn: async () =>
      (await apiClient.get('/expenses', {
        params: { status: filter === 'all' ? undefined : filter, limit: 100 },
      })).data as { data: Expense[] },
  });

  const act = useMutation({
    mutationFn: (p: { id: string; action: 'approve' | 'reject' | 'paid'; note?: string }) =>
      apiClient.patch(`/expenses/${p.id}/${p.action}`, { note: p.note }),
    onSuccess: (_r, p) => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      toast.success(`Expense ${p.action === 'paid' ? 'marked paid' : `${p.action}d`} — the worker has been notified`);
    },
    onError: () => toast.error('Action failed'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-primary-500" />
          </div>
          <h1 className="page-header">Expenses</h1>
        </div>
        <div className="flex gap-2">
          {(['submitted', 'approved', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium capitalize ${
                filter === f ? 'bg-primary-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              {f === 'submitted' ? 'To review' : f}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
        ) : (data?.data ?? []).length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">Nothing here 🎉</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                {['Date', 'Category', 'Description', 'Amount', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {(data?.data ?? []).map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDisplayDate(e.expenseDate)}</td>
                  <td className="px-4 py-3 capitalize text-slate-600">{e.category}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-[280px]">{e.description}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">£{Number(e.amount).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <Badge color={STATUS_COLOR[e.status]} dot><span className="capitalize">{e.status}</span></Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {e.status === 'submitted' && (
                        <>
                          <button className="btn-primary text-xs" onClick={() => act.mutate({ id: e.id, action: 'approve' })}>Approve</button>
                          <button
                            className="btn-secondary text-xs text-red-600"
                            onClick={() => {
                              const note = window.prompt('Reason for rejecting?') ?? undefined;
                              if (note !== undefined) act.mutate({ id: e.id, action: 'reject', note });
                            }}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {e.status === 'approved' && (
                        <button className="btn-secondary text-xs" onClick={() => act.mutate({ id: e.id, action: 'paid' })}>Mark paid</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
