import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users, Calendar, AlertTriangle, Heart, Pill, CheckCircle, XCircle, Clock,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';
import { apiClient } from '../../services/api.client';
import { formatDisplayDate } from '@my-cura/shared-utils';

interface Overview {
  people: { activeWorkers: number; activeServiceUsers: number };
  shifts: { todayTotal: number; todayCompleted: number; thisWeek: number };
  medication: { givenToday: number; pendingToday: number; refusedToday: number; missedToday: number; complianceToday: number };
  attention: { openEscalations: number; pendingLeave: number; pendingExpenses: number; trainingExpiring30d: number; openWhistleblowing: number };
}

interface ExpiringDoc { id: string; title: string; type: string; expiresAt: string }

export function DashboardPage() {
  const { user } = useAuthStore();

  const { data: o } = useQuery<Overview>({
    queryKey: ['analytics-overview'],
    queryFn: async () => (await apiClient.get('/analytics/overview')).data,
    refetchInterval: 60_000,
  });

  const { data: expiring } = useQuery<ExpiringDoc[]>({
    queryKey: ['hr-expiring'],
    queryFn: async () => (await apiClient.get('/hr/documents/expiring?days=60')).data,
  });

  const stats = [
    { label: 'Active Care Workers', value: o?.people.activeWorkers, icon: Users, cls: 'bg-primary-50 dark:bg-primary-900/30 text-primary-500' },
    { label: 'Service Users', value: o?.people.activeServiceUsers, icon: Heart, cls: 'bg-secondary-50 dark:bg-secondary-900/30 text-secondary-500' },
    { label: 'Shifts Today', value: o != null ? `${o.shifts.todayCompleted}/${o.shifts.todayTotal}` : undefined, icon: Calendar, cls: 'bg-accent-50 dark:bg-accent-900/30 text-accent-500' },
    { label: 'Shifts This Week', value: o?.shifts.thisWeek, icon: Clock, cls: 'bg-amber-50 dark:bg-amber-900/30 text-amber-500' },
  ];

  const attention = o ? [
    { label: 'Open care escalations', value: o.attention.openEscalations, href: '/service-users', danger: o.attention.openEscalations > 0 },
    { label: 'Leave requests waiting', value: o.attention.pendingLeave, href: '/workers' },
    { label: 'Expenses to review', value: o.attention.pendingExpenses, href: '/expenses' },
    { label: 'Training expiring in 30 days', value: o.attention.trainingExpiring30d, href: '/training' },
    { label: 'Whistleblowing reports open', value: o.attention.openWhistleblowing, href: '/whistleblowing', danger: o.attention.openWhistleblowing > 0 },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Good {getTimeOfDay()}, {user?.firstName} 👋</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Live picture of your agency right now.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${s.cls}`}>
              <s.icon className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{s.value ?? '—'}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Needs attention */}
        <div className="card p-6">
          <h2 className="section-header flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Needs Attention
          </h2>
          <div className="space-y-2">
            {attention.map((a) => (
              <Link key={a.label} to={a.href} className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                <span className="text-sm text-slate-600 dark:text-slate-300">{a.label}</span>
                <span className={`text-sm font-bold ${a.danger ? 'text-red-600' : a.value ? 'text-primary-600' : 'text-slate-400'}`}>
                  {a.value}
                </span>
              </Link>
            ))}
            {!o && <p className="text-sm text-slate-400 py-6 text-center">Loading…</p>}
          </div>
        </div>

        {/* MAR compliance */}
        <div className="card p-6">
          <h2 className="section-header flex items-center gap-2 mb-4">
            <Pill className="w-4 h-4 text-accent-500" /> Medication Today
          </h2>
          {o ? (
            <>
              <div className="text-4xl font-bold text-slate-900 dark:text-white mb-1">
                {o.medication.complianceToday}%
                <span className="text-sm font-medium text-slate-400 ml-2">compliance</span>
              </div>
              <div className="flex flex-wrap gap-4 mt-4 text-sm">
                <span className="flex items-center gap-1.5 text-green-600"><CheckCircle className="w-4 h-4" /> {o.medication.givenToday} given</span>
                <span className="flex items-center gap-1.5 text-violet-600"><Clock className="w-4 h-4" /> {o.medication.pendingToday} still due</span>
                <span className="flex items-center gap-1.5 text-red-600"><XCircle className="w-4 h-4" /> {o.medication.refusedToday} refused</span>
                <span className="flex items-center gap-1.5 text-amber-600"><AlertTriangle className="w-4 h-4" /> {o.medication.missedToday} missed</span>
              </div>
              <Link to="/mar" className="inline-block mt-4 text-xs font-medium text-primary-600 hover:underline">
                Open the MAR charts →
              </Link>
            </>
          ) : (
            <p className="text-sm text-slate-400 py-6 text-center">Loading…</p>
          )}
        </div>

        {/* Expiring documents */}
        <div className="card p-6 lg:col-span-2">
          <h2 className="section-header flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-red-500" /> Documents Expiring (60 days)
          </h2>
          {(expiring ?? []).length === 0 ? (
            <p className="text-sm text-slate-400">All staff documents up to date 🎉</p>
          ) : (
            <div className="space-y-2">
              {expiring!.slice(0, 6).map((d) => (
                <div key={d.id} className="flex items-center justify-between text-sm rounded-lg px-3 py-2 bg-red-50/60 dark:bg-red-900/10">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{d.title}</span>
                  <span className="text-red-600 font-semibold">expires {formatDisplayDate(d.expiresAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
