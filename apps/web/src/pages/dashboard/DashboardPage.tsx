import { useAuthStore } from '../../stores/auth.store';
import {
  Users, Calendar, Clock, AlertTriangle, TrendingUp,
  Heart, Pill, CheckCircle, XCircle, ArrowUpRight,
} from 'lucide-react';

const stats = [
  { label: 'Active Care Workers', value: '—', change: null, icon: Users, color: 'blue' },
  { label: 'Shifts Today', value: '—', change: null, icon: Calendar, color: 'teal' },
  { label: 'Hours Delivered (Week)', value: '—', change: null, icon: Clock, color: 'green' },
  { label: 'Open Incidents', value: '—', change: null, icon: AlertTriangle, color: 'amber' },
];

const colorMap: Record<string, string> = {
  blue: 'bg-primary-50 dark:bg-primary-900/30 text-primary-500',
  teal: 'bg-secondary-50 dark:bg-secondary-900/30 text-secondary-500',
  green: 'bg-accent-50 dark:bg-accent-900/30 text-accent-500',
  amber: 'bg-amber-50 dark:bg-amber-900/30 text-amber-500',
};

export function DashboardPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-header">
          Good {getTimeOfDay()}, {user?.firstName} 👋
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Here's what's happening in your agency today.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[stat.color]}`}>
                <stat.icon className="w-4 h-4" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {stat.value}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's shifts */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-header flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary-500" />
              Today's Shifts
            </h2>
            <span className="text-xs text-primary-600 hover:underline cursor-pointer font-medium">
              View all
            </span>
          </div>
          <EmptyState icon={Calendar} label="No shifts scheduled for today" />
        </div>

        {/* Recent activity */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-header flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-secondary-500" />
              Recent Activity
            </h2>
          </div>
          <EmptyState icon={TrendingUp} label="No recent activity" />
        </div>

        {/* MAR compliance */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-header flex items-center gap-2">
              <Pill className="w-4 h-4 text-accent-500" />
              Medication Compliance Today
            </h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-accent-500" />
              <span className="text-slate-600 dark:text-slate-300">Given: —</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <XCircle className="w-4 h-4 text-red-400" />
              <span className="text-slate-600 dark:text-slate-300">Missed: —</span>
            </div>
          </div>
          <EmptyState icon={Pill} label="No MAR data for today" className="mt-4" />
        </div>

        {/* Expiring documents */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-header flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Expiring Documents
            </h2>
          </div>
          <EmptyState icon={Heart} label="All documents up to date" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, label, className = '' }: { icon: React.ElementType; label: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center py-8 text-slate-300 dark:text-slate-600 ${className}`}>
      <Icon className="w-8 h-8 mb-2" />
      <p className="text-sm text-slate-400 dark:text-slate-500">{label}</p>
    </div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
