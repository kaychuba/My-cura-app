import { useState, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Pencil, ChevronDown, ChevronUp, FileText,
  GraduationCap, PoundSterling, ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal, Badge } from '@my-cura/ui-web';
import { apiClient } from '../../services/api.client';
import { formatDisplayDate } from '@my-cura/shared-utils';

interface Worker {
  id: string;
  userId: string;
  employeeId?: string;
  employmentType: string;
  contractStart?: string;
  hourlyRate?: number;
  weekendRate?: number;
  payFrequency?: string;
  skills?: string[];
  dbsCertNumber?: string;
  dbsExpiresAt?: string;
  rtwExpiresAt?: string;
  user?: { id: string; email: string; firstName: string; lastName: string; phone?: string; status: string };
}

interface HRDoc {
  id: string;
  type: string;
  title: string;
  issuedAt?: string;
  expiresAt?: string;
}

interface TrainingRecord {
  id: string;
  status: string;
  completedAt?: string;
  expiresAt?: string;
  course?: { id: string; name: string; mandatory: boolean };
}

const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'zero_hours', 'contractor', 'bank'];

interface WorkerForm {
  // new-account fields (create only)
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  // worker profile
  employeeId: string;
  employmentType: string;
  contractStart: string;
  hourlyRate: string;
  weekendRate: string;
  payFrequency: string;
  skills: string;
  dbsCertNumber: string;
  dbsExpiresAt: string;
  rtwExpiresAt: string;
}

const emptyForm: WorkerForm = {
  firstName: '', lastName: '', email: '', password: '',
  employeeId: '', employmentType: 'full_time', contractStart: '',
  hourlyRate: '', weekendRate: '', payFrequency: 'weekly',
  skills: '', dbsCertNumber: '', dbsExpiresAt: '', rtwExpiresAt: '',
};

export function WorkersPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Worker | null>(null);
  const [form, setForm] = useState<WorkerForm>(emptyForm);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['care-workers'],
    queryFn: async () =>
      (await apiClient.get('/care-workers', { params: { limit: 100 } })).data as { data: Worker[]; total: number },
  });

  const save = useMutation({
    mutationFn: async (payload: { editing: Worker | null; form: WorkerForm }) => {
      const f = payload.form;
      const profile = {
        employeeId: f.employeeId.trim() || undefined,
        employmentType: f.employmentType,
        contractStart: f.contractStart || undefined,
        hourlyRate: f.hourlyRate ? Number(f.hourlyRate) : undefined,
        weekendRate: f.weekendRate ? Number(f.weekendRate) : undefined,
        payFrequency: f.payFrequency,
        skills: f.skills.split(',').map((s) => s.trim()).filter(Boolean),
        dbsCertNumber: f.dbsCertNumber.trim() || undefined,
        dbsExpiresAt: f.dbsExpiresAt || undefined,
        rtwExpiresAt: f.rtwExpiresAt || undefined,
      };
      if (payload.editing) {
        return apiClient.patch(`/care-workers/${payload.editing.id}`, profile);
      }
      // Create the login first, then the worker profile linked to it
      const { data: user } = await apiClient.post('/users', {
        email: f.email.trim(),
        password: f.password,
        firstName: f.firstName.trim(),
        lastName: f.lastName.trim(),
        role: 'care_worker',
      });
      return apiClient.post('/care-workers', { userId: user.id, ...profile, hourlyRate: Number(f.hourlyRate) });
    },
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ['care-workers'] });
      setModalOpen(false);
      toast.success(vars.editing ? 'Worker updated' : 'Care worker created — they can log in to the app now');
    },
    onError: (err: { response?: { data?: { message?: string | string[] } } }) => {
      const m = err.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m ?? 'Failed to save');
    },
  });

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (w: Worker) => {
    setEditing(w);
    setForm({
      ...emptyForm,
      employeeId: w.employeeId ?? '',
      employmentType: w.employmentType,
      contractStart: w.contractStart?.split('T')[0] ?? '',
      hourlyRate: w.hourlyRate != null ? String(w.hourlyRate) : '',
      weekendRate: w.weekendRate != null ? String(w.weekendRate) : '',
      payFrequency: w.payFrequency ?? 'weekly',
      skills: (w.skills ?? []).join(', '),
      dbsCertNumber: w.dbsCertNumber ?? '',
      dbsExpiresAt: w.dbsExpiresAt?.split('T')[0] ?? '',
      rtwExpiresAt: w.rtwExpiresAt?.split('T')[0] ?? '',
    });
    setModalOpen(true);
  };

  const submit = () => {
    if (!editing) {
      if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || form.password.length < 8) {
        toast.error('Name, email and a password of 8+ characters are required');
        return;
      }
      if (!form.hourlyRate || Number(form.hourlyRate) <= 0) {
        toast.error('Set an hourly rate');
        return;
      }
    }
    save.mutate({ editing, form });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-primary-500" />
          </div>
          <h1 className="page-header">Care Workers</h1>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={openAdd}>
          <Plus className="w-4 h-4" />
          Add Care Worker
        </button>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse bg-slate-100 rounded-lg" />
            ))}
          </div>
        ) : (data?.data ?? []).length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No care workers yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                {['Name', 'Employment', 'Hourly Rate', 'DBS Expires', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {(data?.data ?? []).map((w) => (
                <WorkerRow
                  key={w.id}
                  worker={w}
                  expanded={expanded === w.id}
                  onToggle={() => setExpanded(expanded === w.id ? null : w.id)}
                  onEdit={() => openEdit(w)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${editing.user?.firstName} ${editing.user?.lastName}` : 'Add Care Worker'}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary disabled:opacity-50" disabled={save.isPending} onClick={submit}>
              {save.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Create Worker'}
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {!editing && (
            <>
              <Sec title="Login (they use this in the carer app)" />
              <F label="First name *"><input className="input w-full" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></F>
              <F label="Last name *"><input className="input w-full" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></F>
              <F label="Email *"><input className="input w-full" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></F>
              <F label="Temporary password * (8+ chars)"><input className="input w-full" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></F>
            </>
          )}

          <Sec title="Employment" />
          <F label="Employee ID"><input className="input w-full" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} /></F>
          <F label="Employment type">
            <select className="input w-full" value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })}>
              {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </F>
          <F label="Contract start"><input className="input w-full" type="date" value={form.contractStart} onChange={(e) => setForm({ ...form, contractStart: e.target.value })} /></F>
          <F label="Skills (comma-separated)"><input className="input w-full" placeholder="personal_care, medication" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} /></F>

          <Sec title="Pay (never visible to care workers)" />
          <F label={editing ? 'Hourly rate (£)' : 'Hourly rate (£) *'}><input className="input w-full" type="number" step="0.01" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} /></F>
          <F label="Weekend rate (£)"><input className="input w-full" type="number" step="0.01" value={form.weekendRate} onChange={(e) => setForm({ ...form, weekendRate: e.target.value })} /></F>
          <F label="Pay frequency">
            <select className="input w-full" value={form.payFrequency} onChange={(e) => setForm({ ...form, payFrequency: e.target.value })}>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </F>

          <Sec title="Compliance" />
          <F label="DBS certificate number"><input className="input w-full" value={form.dbsCertNumber} onChange={(e) => setForm({ ...form, dbsCertNumber: e.target.value })} /></F>
          <F label="DBS expires"><input className="input w-full" type="date" value={form.dbsExpiresAt} onChange={(e) => setForm({ ...form, dbsExpiresAt: e.target.value })} /></F>
          <F label="Right-to-work expires"><input className="input w-full" type="date" value={form.rtwExpiresAt} onChange={(e) => setForm({ ...form, rtwExpiresAt: e.target.value })} /></F>
        </div>
      </Modal>
    </div>
  );
}

function WorkerRow({ worker: w, expanded, onToggle, onEdit }: {
  worker: Worker; expanded: boolean; onToggle: () => void; onEdit: () => void;
}) {
  const { data: docs } = useQuery<HRDoc[]>({
    queryKey: ['hr-docs', w.userId],
    queryFn: async () => (await apiClient.get(`/hr/documents?userId=${w.userId}`)).data,
    enabled: expanded,
  });
  const { data: training } = useQuery<TrainingRecord[]>({
    queryKey: ['training', w.userId],
    queryFn: async () => (await apiClient.get(`/training/user/${w.userId}`)).data,
    enabled: expanded,
  });

  const dbsSoon = w.dbsExpiresAt && new Date(w.dbsExpiresAt) < new Date(Date.now() + 60 * 86400e3);

  return (
    <>
      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer" onClick={onToggle}>
        <td className="px-4 py-3">
          <div className="font-medium text-slate-800 dark:text-slate-200">
            {w.user ? `${w.user.firstName} ${w.user.lastName}` : '—'}
          </div>
          <div className="text-xs text-slate-400">{w.user?.email}</div>
        </td>
        <td className="px-4 py-3 text-slate-500 capitalize">{w.employmentType?.replace(/_/g, ' ')}</td>
        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
          <span className="inline-flex items-center gap-1">
            <PoundSterling className="w-3.5 h-3.5 text-slate-400" />
            {w.hourlyRate != null ? Number(w.hourlyRate).toFixed(2) : '—'}/h
          </span>
        </td>
        <td className={`px-4 py-3 whitespace-nowrap ${dbsSoon ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
          {w.dbsExpiresAt ? formatDisplayDate(w.dbsExpiresAt) : '—'}
        </td>
        <td className="px-4 py-3">
          <Badge color={w.user?.status === 'active' ? 'green' : 'gray'} dot>
            <span className="capitalize">{w.user?.status ?? 'unknown'}</span>
          </Badge>
        </td>
        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-1">
            <button title="Edit" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" onClick={onEdit}>
              <Pencil className="w-4 h-4" />
            </button>
            <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" onClick={onToggle}>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="px-6 pb-5 pt-1 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> HR Documents
                </p>
                {(docs ?? []).length === 0 ? (
                  <p className="text-sm text-slate-400">None on file</p>
                ) : (
                  <ul className="space-y-1.5">
                    {docs!.map((d) => (
                      <li key={d.id} className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium">{d.title}</span>
                        <span className="text-xs text-slate-400 capitalize">({d.type.replace(/_/g, ' ')})</span>
                        {d.expiresAt && (
                          <span className={`text-xs ${new Date(d.expiresAt) < new Date(Date.now() + 60 * 86400e3) ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
                            expires {formatDisplayDate(d.expiresAt)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5" /> Training
                </p>
                {(training ?? []).length === 0 ? (
                  <p className="text-sm text-slate-400">No training assigned</p>
                ) : (
                  <ul className="space-y-1.5">
                    {training!.map((t) => (
                      <li key={t.id} className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
                        <Badge color={t.status === 'completed' ? 'green' : t.status === 'expired' ? 'red' : 'amber'} dot>
                          {t.status}
                        </Badge>
                        <span className="font-medium">{t.course?.name ?? 'Course'}</span>
                        {t.expiresAt && (
                          <span className="text-xs text-slate-400">valid until {formatDisplayDate(t.expiresAt)}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Sec({ title }: { title: string }) {
  return (
    <div className="sm:col-span-2 border-b border-slate-200 dark:border-slate-700 pb-1 mt-2">
      <span className="text-sm font-bold text-primary-600">{title}</span>
    </div>
  );
}

function F({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}
