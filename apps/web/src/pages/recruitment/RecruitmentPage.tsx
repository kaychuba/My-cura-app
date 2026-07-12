import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '@my-cura/ui-web';
import { apiClient } from '../../services/api.client';

interface Applicant {
  id: string; firstName: string; lastName: string; email: string;
  phone?: string; roleAppliedFor: string; stage: string; notes?: string;
}

const STAGES = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'] as const;
const STAGE_CLS: Record<string, string> = {
  applied: 'border-slate-300', screening: 'border-amber-400', interview: 'border-violet-400',
  offer: 'border-blue-400', hired: 'border-green-500', rejected: 'border-red-400',
};

export function RecruitmentPage() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', roleAppliedFor: 'Care Worker' });

  const { data } = useQuery({
    queryKey: ['applicants'],
    queryFn: async () => (await apiClient.get('/recruitment/applicants')).data as { data: Applicant[]; counts: Record<string, number> },
  });

  const add = useMutation({
    mutationFn: () => apiClient.post('/recruitment/applicants', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applicants'] });
      setAddOpen(false);
      toast.success('Applicant added');
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? 'Failed to add'),
  });

  const move = useMutation({
    mutationFn: (p: { id: string; stage: string }) =>
      apiClient.patch(`/recruitment/applicants/${p.id}/stage`, { stage: p.stage }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['applicants'] }),
    onError: () => toast.error('Failed to move applicant'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-primary-500" />
          </div>
          <h1 className="page-header">Recruitment</h1>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4" /> Add Applicant
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {STAGES.map((stage) => (
          <div key={stage} className={`card p-3 border-t-4 ${STAGE_CLS[stage]}`}>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
              {stage} ({data?.counts?.[stage] ?? 0})
            </p>
            <div className="space-y-2">
              {(data?.data ?? []).filter((a) => a.stage === stage).map((a) => (
                <div key={a.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{a.firstName} {a.lastName}</p>
                  <p className="text-xs text-slate-400 truncate">{a.roleAppliedFor}</p>
                  <select
                    className="input mt-2 w-full text-xs py-1"
                    value={a.stage}
                    onChange={(e) => move.mutate({ id: a.id, stage: e.target.value })}
                  >
                    {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Applicant"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setAddOpen(false)}>Cancel</button>
            <button
              className="btn-primary disabled:opacity-50"
              disabled={!form.firstName.trim() || !form.email.trim() || add.isPending}
              onClick={() => add.mutate()}
            >
              {add.isPending ? 'Adding…' : 'Add to Pipeline'}
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <input className="input" placeholder="First name *" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          <input className="input" placeholder="Last name *" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          <input className="input col-span-2" placeholder="Email *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="input" placeholder="Role applied for" value={form.roleAppliedFor} onChange={(e) => setForm({ ...form, roleAppliedFor: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
