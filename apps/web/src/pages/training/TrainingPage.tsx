import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, Plus, UserPlus, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Modal } from '@my-cura/ui-web';
import { apiClient } from '../../services/api.client';
import { formatDisplayDate } from '@my-cura/shared-utils';

interface Course { id: string; name: string; description?: string; validityMonths?: number; mandatory: boolean }
interface Expiring { id: string; userId: string; expiresAt: string; course?: { name: string } }
interface Worker { id: string; userId: string; user?: { firstName: string; lastName: string } }

export function TrainingPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [assignFor, setAssignFor] = useState<Course | null>(null);
  const [form, setForm] = useState({ name: '', description: '', validityMonths: '12', mandatory: false });
  const [selected, setSelected] = useState<string[]>([]);

  const { data: courses } = useQuery<Course[]>({
    queryKey: ['training-courses'],
    queryFn: async () => (await apiClient.get('/training/courses')).data,
  });
  const { data: expiring } = useQuery<Expiring[]>({
    queryKey: ['training-expiring'],
    queryFn: async () => (await apiClient.get('/training/expiring?days=60')).data,
  });
  const { data: workers } = useQuery<{ data: Worker[] }>({
    queryKey: ['care-workers'],
    queryFn: async () => (await apiClient.get('/care-workers', { params: { limit: 100 } })).data,
    enabled: !!assignFor,
  });

  const createCourse = useMutation({
    mutationFn: () =>
      apiClient.post('/training/courses', {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        validityMonths: form.validityMonths ? Number(form.validityMonths) : undefined,
        mandatory: form.mandatory,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['training-courses'] });
      setCreateOpen(false);
      toast.success('Course created');
    },
    onError: () => toast.error('Failed to create course'),
  });

  const assign = useMutation({
    mutationFn: () =>
      apiClient.post('/training/assign', { courseId: assignFor!.id, userIds: selected }),
    onSuccess: (res) => {
      setAssignFor(null);
      toast.success(`Assigned to ${res.data.length} worker(s) — they've been notified`);
    },
    onError: () => toast.error('Failed to assign'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary-500" />
          </div>
          <h1 className="page-header">Training</h1>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => { setForm({ name: '', description: '', validityMonths: '12', mandatory: false }); setCreateOpen(true); }}>
          <Plus className="w-4 h-4" /> New Course
        </button>
      </div>

      {(expiring ?? []).length > 0 && (
        <div className="card p-5 border-l-4 border-red-400">
          <h2 className="section-header flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-500" /> Expiring within 60 days
          </h2>
          <div className="space-y-1.5">
            {expiring!.map((e) => (
              <p key={e.id} className="text-sm text-slate-600 dark:text-slate-300">
                <span className="font-medium">{e.course?.name ?? 'Course'}</span>
                <span className="text-red-600 font-semibold"> — expires {formatDisplayDate(e.expiresAt)}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(courses ?? []).map((c) => (
          <div key={c.id} className="card p-5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">{c.name}</h3>
              {c.mandatory && <Badge color="red" dot>Mandatory</Badge>}
            </div>
            {c.description && <p className="text-sm text-slate-500 mt-1">{c.description}</p>}
            <p className="text-xs text-slate-400 mt-2">
              {c.validityMonths ? `Valid ${c.validityMonths} months after completion` : 'Never expires'}
            </p>
            <button
              className="btn-secondary text-sm mt-4 flex items-center gap-1.5"
              onClick={() => { setAssignFor(c); setSelected([]); }}
            >
              <UserPlus className="w-4 h-4" /> Assign to workers
            </button>
          </div>
        ))}
        {(courses ?? []).length === 0 && (
          <p className="text-sm text-slate-400 col-span-full">No courses yet — create the first one.</p>
        )}
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Training Course"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button className="btn-primary disabled:opacity-50" disabled={!form.name.trim() || createCourse.isPending} onClick={() => createCourse.mutate()}>
              {createCourse.isPending ? 'Creating…' : 'Create Course'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Name *</label>
            <input className="input w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Safeguarding Adults Level 2" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
            <textarea className="input w-full min-h-[70px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex items-end gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Valid for (months)</label>
              <input className="input w-32" type="number" min="0" value={form.validityMonths} onChange={(e) => setForm({ ...form, validityMonths: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 pb-2.5">
              <input type="checkbox" checked={form.mandatory} onChange={(e) => setForm({ ...form, mandatory: e.target.checked })} />
              Mandatory for all staff
            </label>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!assignFor}
        onClose={() => setAssignFor(null)}
        title={assignFor ? `Assign: ${assignFor.name}` : ''}
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setAssignFor(null)}>Cancel</button>
            <button className="btn-primary disabled:opacity-50" disabled={selected.length === 0 || assign.isPending} onClick={() => assign.mutate()}>
              {assign.isPending ? 'Assigning…' : `Assign to ${selected.length} worker(s)`}
            </button>
          </div>
        }
      >
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {(workers?.data ?? []).map((w) => (
            <label key={w.userId} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(w.userId)}
                onChange={(e) =>
                  setSelected((s) => e.target.checked ? [...s, w.userId] : s.filter((x) => x !== w.userId))
                }
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {w.user ? `${w.user.firstName} ${w.user.lastName}` : w.userId}
              </span>
            </label>
          ))}
        </div>
      </Modal>
    </div>
  );
}
