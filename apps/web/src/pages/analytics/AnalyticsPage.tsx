import { useQuery } from '@tanstack/react-query';
import { BarChart3, Users, Calendar, Pill, AlertTriangle } from 'lucide-react';
import { apiClient } from '../../services/api.client';

interface Overview {
  people: { activeWorkers: number; activeServiceUsers: number };
  shifts: { todayTotal: number; todayCompleted: number; thisWeek: number };
  medication: { givenToday: number; pendingToday: number; refusedToday: number; missedToday: number; complianceToday: number };
  attention: { openEscalations: number; pendingLeave: number; pendingExpenses: number; trainingExpiring30d: number; openWhistleblowing: number };
}

export function AnalyticsPage() {
  const { data: o, isLoading } = useQuery<Overview>({
    queryKey: ['analytics-overview'],
    queryFn: async () => (await apiClient.get('/analytics/overview')).data,
    refetchInterval: 60_000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-primary-500" />
        </div>
        <h1 className="page-header">Analytics</h1>
      </div>

      {isLoading || !o ? (
        <div className="card p-10 text-center text-slate-400 text-sm">Crunching the numbers…</div>
      ) : (
        <>
          <Section icon={<Users className="w-4 h-4 text-primary-500" />} title="People">
            <Tile label="Active care workers" value={o.people.activeWorkers} />
            <Tile label="Active service users" value={o.people.activeServiceUsers} />
            <Tile label="Workers per service user" value={o.people.activeServiceUsers ? (o.people.activeWorkers / o.people.activeServiceUsers).toFixed(1) : '—'} />
          </Section>

          <Section icon={<Calendar className="w-4 h-4 text-secondary-500" />} title="Care Delivery">
            <Tile label="Shifts today" value={o.shifts.todayTotal} />
            <Tile label="Completed today" value={o.shifts.todayCompleted} good />
            <Tile label="Shifts this week" value={o.shifts.thisWeek} />
          </Section>

          <Section icon={<Pill className="w-4 h-4 text-accent-500" />} title="Medication Today">
            <Tile label="Compliance" value={`${o.medication.complianceToday}%`} good={o.medication.complianceToday >= 95} bad={o.medication.complianceToday < 80} />
            <Tile label="Given" value={o.medication.givenToday} good />
            <Tile label="Still due" value={o.medication.pendingToday} />
            <Tile label="Refused" value={o.medication.refusedToday} bad={o.medication.refusedToday > 0} />
            <Tile label="Missed" value={o.medication.missedToday} bad={o.medication.missedToday > 0} />
          </Section>

          <Section icon={<AlertTriangle className="w-4 h-4 text-amber-500" />} title="Risk & Workload">
            <Tile label="Open escalations" value={o.attention.openEscalations} bad={o.attention.openEscalations > 0} />
            <Tile label="Pending leave requests" value={o.attention.pendingLeave} />
            <Tile label="Expenses awaiting review" value={o.attention.pendingExpenses} />
            <Tile label="Training expiring (30d)" value={o.attention.trainingExpiring30d} bad={o.attention.trainingExpiring30d > 0} />
            <Tile label="Whistleblowing open" value={o.attention.openWhistleblowing} bad={o.attention.openWhistleblowing > 0} />
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <h2 className="section-header flex items-center gap-2 mb-4">{icon} {title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">{children}</div>
    </div>
  );
}

function Tile({ label, value, good, bad }: { label: string; value: number | string; good?: boolean; bad?: boolean }) {
  return (
    <div>
      <div className={`text-2xl font-bold ${bad ? 'text-red-600' : good ? 'text-green-600' : 'text-slate-900 dark:text-white'}`}>
        {value}
      </div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}
