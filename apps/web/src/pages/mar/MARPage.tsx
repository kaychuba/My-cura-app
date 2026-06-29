import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Pill, CheckCircle, XCircle, AlertTriangle, TrendingUp,
  ChevronLeft, ChevronRight, Calendar,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { apiClient } from '../../services/api.client';
import { MARStatus } from '@my-cura/shared-types';
import { formatDisplayDate } from '@my-cura/shared-utils';

interface DailyMARSummary {
  date: string;
  total: number;
  given: number;
  missed: number;
  refused: number;
  complianceRate: number;
}

interface MARRecord {
  id: string;
  scheduledAt: string;
  status: MARStatus;
  administeredAt?: string;
  medication?: { name: string; dosage: string };
  careWorker?: { firstName: string; lastName: string };
}

const statusConfig: Record<MARStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  [MARStatus.GIVEN]: { label: 'Given', color: 'text-green-600', icon: CheckCircle },
  [MARStatus.PRN_GIVEN]: { label: 'PRN Given', color: 'text-green-500', icon: CheckCircle },
  [MARStatus.REFUSED]: { label: 'Refused', color: 'text-red-600', icon: XCircle },
  [MARStatus.OMITTED]: { label: 'Omitted', color: 'text-amber-600', icon: AlertTriangle },
  [MARStatus.NOT_AVAILABLE]: { label: 'Not Available', color: 'text-slate-500', icon: AlertTriangle },
  [MARStatus.PRN_NOT_REQUIRED]: { label: 'PRN Not Required', color: 'text-slate-400', icon: CheckCircle },
};

export function MARPage() {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today.toISOString().split('T')[0]);
  const [chartRange, setChartRange] = useState(14);

  const chartEndDate = new Date();
  const chartStartDate = new Date();
  chartStartDate.setDate(chartStartDate.getDate() - chartRange);

  // For demo we use a static serviceUserId — in real app comes from route param
  const serviceUserId = null as string | null;

  const { data: dailyData, isLoading: dailyLoading } = useQuery({
    queryKey: ['mar-daily', serviceUserId, selectedDate],
    queryFn: async () => {
      if (!serviceUserId) return null;
      const { data } = await apiClient.get(`/mar/daily?serviceUserId=${serviceUserId}&date=${selectedDate}`);
      return data;
    },
    enabled: !!serviceUserId,
  });

  const { data: chartData, isLoading: chartLoading } = useQuery<DailyMARSummary[]>({
    queryKey: ['mar-chart', serviceUserId, chartStartDate.toISOString(), chartEndDate.toISOString()],
    queryFn: async () => {
      if (!serviceUserId) return [];
      const { data } = await apiClient.get(
        `/mar/chart?serviceUserId=${serviceUserId}&startDate=${chartStartDate.toISOString()}&endDate=${chartEndDate.toISOString()}`,
      );
      return data;
    },
    enabled: !!serviceUserId,
  });

  const { data: missedMeds } = useQuery<MARRecord[]>({
    queryKey: ['mar-missed'],
    queryFn: async () => {
      const { data } = await apiClient.get('/mar/missed');
      return data;
    },
  });

  const prevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const nextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    if (d <= today) setSelectedDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-secondary-50 dark:bg-secondary-900/30 rounded-xl flex items-center justify-center">
            <Pill className="w-5 h-5 text-secondary-500" />
          </div>
          <h1 className="page-header">Medication Administration Records</h1>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Compliance Today"
          value={dailyData?.summary ? `${dailyData.summary.complianceRate}%` : '—'}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          label="Given Today"
          value={dailyData?.summary?.given ?? '—'}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          label="Missed Today"
          value={dailyData?.summary?.missed ?? '—'}
          icon={AlertTriangle}
          color="amber"
        />
        <StatCard
          label="Refused Today"
          value={dailyData?.summary?.refused ?? '—'}
          icon={XCircle}
          color="red"
        />
      </div>

      {/* Two-column: chart + missed meds */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compliance chart */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-header flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-secondary-500" />
              Compliance Trend ({chartRange} days)
            </h2>
            <div className="flex gap-2">
              {[7, 14, 30].map((n) => (
                <button
                  key={n}
                  onClick={() => setChartRange(n)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    chartRange === n
                      ? 'bg-primary-500 text-white'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {n}d
                </button>
              ))}
            </div>
          </div>
          {chartLoading ? (
            <div className="h-48 animate-pulse bg-slate-100 rounded-lg" />
          ) : chartData && chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#94A3B8' }}
                  tickFormatter={(d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} domain={[0, 100]} unit="%" />
                <Tooltip
                  formatter={(v) => [`${v}%`, 'Compliance']}
                  labelFormatter={(d) => formatDisplayDate(d)}
                />
                <Bar dataKey="complianceRate" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.complianceRate >= 95 ? '#4ADE80' : entry.complianceRate >= 80 ? '#FCD34D' : '#F87171'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
              Select a service user to view their compliance chart
            </div>
          )}
        </div>

        {/* Missed medications */}
        <div className="card p-6">
          <h2 className="section-header flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Missed (Last 24h)
          </h2>
          {!missedMeds || missedMeds.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <CheckCircle className="w-8 h-8 mb-2 text-green-400" />
              <p className="text-sm">No missed medications</p>
            </div>
          ) : (
            <div className="space-y-3">
              {missedMeds.map((record) => (
                <div key={record.id} className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {record.medication?.name ?? 'Unknown medication'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Scheduled: {new Date(record.scheduledAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {record.careWorker && (
                    <p className="text-xs text-slate-400">
                      Worker: {record.careWorker.firstName} {record.careWorker.lastName}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Daily MAR chart (date navigator) */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-header flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary-500" />
            Daily MAR Chart
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={prevDay} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {formatDisplayDate(selectedDate)}
            </span>
            <button
              onClick={nextDay}
              disabled={selectedDate >= today.toISOString().split('T')[0]}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!serviceUserId ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            Select a service user to view their daily MAR chart
          </div>
        ) : dailyLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse bg-slate-100 rounded-lg" />
            ))}
          </div>
        ) : dailyData?.records?.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  {['Medication', 'Dosage', 'Scheduled', 'Administered', 'Status', 'Care Worker'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-100">
                {dailyData.records.map((rec: MARRecord) => {
                  const cfg = statusConfig[rec.status];
                  const Icon = cfg?.icon ?? CheckCircle;
                  return (
                    <tr key={rec.id}>
                      <td className="px-4 py-3 font-medium text-slate-800">{rec.medication?.name}</td>
                      <td className="px-4 py-3 text-slate-500">{rec.medication?.dosage}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(rec.scheduledAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {rec.administeredAt
                          ? new Date(rec.administeredAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${cfg?.color ?? 'text-slate-500'}`}>
                          <Icon className="w-3.5 h-3.5" />
                          {cfg?.label ?? rec.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {rec.careWorker ? `${rec.careWorker.firstName} ${rec.careWorker.lastName}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 text-sm">
            No MAR records for this date
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label, value, icon: Icon, color,
}: {
  label: string;
  value: string | number;
  icon: typeof TrendingUp;
  color: 'green' | 'amber' | 'red' | 'blue';
}) {
  const colorMap = {
    green: 'bg-green-50 text-green-500',
    amber: 'bg-amber-50 text-amber-500',
    red: 'bg-red-50 text-red-500',
    blue: 'bg-primary-50 text-primary-500',
  };
  return (
    <div className="stat-card">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${colorMap[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
      <div className="text-sm text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}
