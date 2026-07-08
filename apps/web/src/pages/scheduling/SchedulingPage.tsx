import { useMemo, useState, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Plus, ChevronLeft, ChevronRight, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal, Badge } from '@my-cura/ui-web';
import { apiClient } from '../../services/api.client';

interface Shift {
  id: string;
  serviceUserId: string;
  careWorkerId?: string;
  scheduledStart: string;
  scheduledEnd: string;
  shiftType: string;
  status: string;
  serviceUser?: { firstName: string; lastName: string };
}

interface Worker {
  id: string;
  userId: string;
  user?: { firstName: string; lastName: string };
}

interface SU { id: string; firstName: string; lastName: string }

const SHIFT_TYPES = [
  'personal_care', 'medication', 'social', 'overnight',
  'sleep_in', 'waking_night', 'live_in', 'supported_living',
];

const STATUS_COLOR: Record<string, 'green' | 'amber' | 'red' | 'gray' | 'purple'> = {
  unassigned: 'amber',
  assigned: 'purple',
  confirmed: 'purple',
  in_progress: 'green',
  completed: 'gray',
  cancelled: 'red',
  no_show: 'red',
};

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function SchedulingPage() {
  const qc = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    serviceUserId: '', careWorkerId: '', date: new Date().toISOString().split('T')[0],
    start: '09:00', end: '11:00', shiftType: 'personal_care', notes: '',
  });

  const weekEnd = useMemo(() => {
    const e = new Date(weekStart);
    e.setDate(e.getDate() + 7);
    return e;
  }, [weekStart]);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    }),
    [weekStart],
  );

  const { data: shiftsData, isLoading } = useQuery({
    queryKey: ['shifts', weekStart.toISOString()],
    queryFn: async () =>
      (await apiClient.get('/shifts', {
        params: { from: weekStart.toISOString(), to: weekEnd.toISOString(), limit: 500 },
      })).data as { data: Shift[] },
  });

  const { data: workers } = useQuery<{ data: Worker[] }>({
    queryKey: ['care-workers'],
    queryFn: async () => (await apiClient.get('/care-workers', { params: { limit: 100 } })).data,
  });

  const { data: serviceUsers } = useQuery<SU[]>({
    queryKey: ['service-users-options'],
    queryFn: async () =>
      (await apiClient.get('/service-users', { params: { limit: 100 } })).data.data,
  });

  const workerName = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of workers?.data ?? []) {
      if (w.user) map.set(w.userId, `${w.user.firstName} ${w.user.lastName}`);
    }
    return map;
  }, [workers]);

  const createShift = useMutation({
    mutationFn: (dto: Record<string, unknown>) => apiClient.post('/shifts', dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts'] });
      setModalOpen(false);
      toast.success('Shift rostered — it appears on the carer’s calendar');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'Failed to create shift'),
  });

  const cancelShift = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/shifts/${id}/cancel`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts'] });
      toast.success('Shift cancelled');
    },
    onError: () => toast.error('Failed to cancel shift'),
  });

  const submit = () => {
    if (!form.serviceUserId) { toast.error('Pick a service user'); return; }
    if (!form.date || !form.start || !form.end) { toast.error('Set the date and times'); return; }
    createShift.mutate({
      serviceUserId: form.serviceUserId,
      careWorkerId: form.careWorkerId || undefined,
      scheduledStart: new Date(`${form.date}T${form.start}:00`).toISOString(),
      scheduledEnd: new Date(`${form.date}T${form.end}:00`).toISOString(),
      shiftType: form.shiftType,
      notes: form.notes.trim() || undefined,
    });
  };

  const shiftsByDay = useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const s of shiftsData?.data ?? []) {
      const key = new Date(s.scheduledStart).toDateString();
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart));
    }
    return map;
  }, [shiftsData]);

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
            <Calendar className="w-5 h-5 text-primary-500" />
          </div>
          <h1 className="page-header">Scheduling</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
              onClick={() => setWeekStart((w) => { const d = new Date(w); d.setDate(d.getDate() - 7); return d; })}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[190px] text-center">
              {weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} –{' '}
              {days[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <button
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
              onClick={() => setWeekStart((w) => { const d = new Date(w); d.setDate(d.getDate() + 7); return d; })}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button className="btn-secondary text-xs ml-1" onClick={() => setWeekStart(startOfWeek(new Date()))}>
              This week
            </button>
          </div>
          <button
            className="btn-primary flex items-center gap-2"
            onClick={() => {
              setForm({ ...form, date: new Date().toISOString().split('T')[0] });
              setModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            New Shift
          </button>
        </div>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {days.map((day) => {
          const isToday = day.toDateString() === new Date().toDateString();
          const dayShifts = shiftsByDay.get(day.toDateString()) ?? [];
          return (
            <div key={day.toISOString()} className={`card p-3 min-h-[180px] ${isToday ? 'ring-2 ring-primary-400' : ''}`}>
              <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${isToday ? 'text-primary-600' : 'text-slate-500'}`}>
                {day.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}
              </p>
              {isLoading ? (
                <div className="h-16 animate-pulse bg-slate-100 rounded-lg" />
              ) : dayShifts.length === 0 ? (
                <p className="text-xs text-slate-300 dark:text-slate-600">No visits</p>
              ) : (
                <div className="space-y-2">
                  {dayShifts.map((s) => (
                    <div key={s.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-2 text-xs group relative">
                      <p className="font-semibold text-slate-700 dark:text-slate-200">
                        {fmtTime(s.scheduledStart)}–{fmtTime(s.scheduledEnd)}
                      </p>
                      <p className="text-slate-600 dark:text-slate-300 truncate">
                        {s.serviceUser ? `${s.serviceUser.firstName} ${s.serviceUser.lastName}` : 'Service user'}
                      </p>
                      <p className="text-slate-400 truncate">
                        {s.careWorkerId ? workerName.get(s.careWorkerId) ?? 'Assigned' : 'Unassigned'}
                      </p>
                      <div className="mt-1 flex items-center justify-between">
                        <Badge color={STATUS_COLOR[s.status] ?? 'gray'} dot>
                          <span className="capitalize">{s.status.replace(/_/g, ' ')}</span>
                        </Badge>
                        {!['completed', 'cancelled', 'in_progress'].includes(s.status) && (
                          <button
                            title="Cancel shift"
                            className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 transition-opacity"
                            onClick={() => {
                              if (window.confirm('Cancel this shift?')) cancelShift.mutate(s.id);
                            }}
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* New shift modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Roster a Shift"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary disabled:opacity-50" disabled={createShift.isPending} onClick={submit}>
              {createShift.isPending ? 'Saving…' : 'Create Shift'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <F label="Service user *">
            <select className="input w-full" value={form.serviceUserId} onChange={(e) => setForm({ ...form, serviceUserId: e.target.value })}>
              <option value="">Select…</option>
              {(serviceUsers ?? []).map((su) => (
                <option key={su.id} value={su.id}>{su.firstName} {su.lastName}</option>
              ))}
            </select>
          </F>
          <F label="Care worker (leave blank to assign later)">
            <select className="input w-full" value={form.careWorkerId} onChange={(e) => setForm({ ...form, careWorkerId: e.target.value })}>
              <option value="">Unassigned</option>
              {(workers?.data ?? []).map((w) => (
                <option key={w.userId} value={w.userId}>
                  {w.user ? `${w.user.firstName} ${w.user.lastName}` : w.userId}
                </option>
              ))}
            </select>
          </F>
          <div className="grid grid-cols-3 gap-3">
            <F label="Date *"><input type="date" className="input w-full" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></F>
            <F label="Start *"><input type="time" className="input w-full" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></F>
            <F label="End *"><input type="time" className="input w-full" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></F>
          </div>
          <F label="Shift type">
            <select className="input w-full capitalize" value={form.shiftType} onChange={(e) => setForm({ ...form, shiftType: e.target.value })}>
              {SHIFT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </F>
          <F label="Notes">
            <textarea className="input w-full min-h-[60px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </F>
        </div>
      </Modal>
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
