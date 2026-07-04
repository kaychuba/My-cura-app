import { useMemo, useState, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Pill, CheckCircle, XCircle, AlertTriangle, TrendingUp,
  ChevronLeft, ChevronRight, Calendar, Plus, Pencil, CalendarClock, Archive, X,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import toast from 'react-hot-toast';
import { Modal } from '@my-cura/ui-web';
import { apiClient } from '../../services/api.client';
import { MARStatus, MedicationFormulation, MedicationRoute } from '@my-cura/shared-types';
import { formatDisplayDate } from '@my-cura/shared-utils';

interface ServiceUser {
  id: string;
  firstName: string;
  lastName: string;
}

interface Medication {
  id: string;
  name: string;
  genericName?: string;
  purpose?: string;
  dosage: string;
  quantity?: string;
  formulation?: MedicationFormulation;
  route: MedicationRoute;
  frequency: string;
  prescriber?: string;
  isControlled: boolean;
  cdSchedule?: string;
}

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
  medicationId: string;
  scheduledAt: string;
  status: MARStatus;
  administeredAt?: string;
  recordedAt?: string;
  initials?: string;
  witnessInitials?: string;
  reasonNotGiven?: string;
  medication?: { name: string; dosage: string };
  careWorker?: { firstName: string; lastName: string };
}

const statusConfig: Record<MARStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  [MARStatus.SCHEDULED]: { label: 'Scheduled', color: 'text-violet-600', icon: Calendar },
  [MARStatus.GIVEN]: { label: 'Administered', color: 'text-green-600', icon: CheckCircle },
  [MARStatus.PARENT_ADMINISTERED]: { label: 'Parent Administered', color: 'text-green-500', icon: CheckCircle },
  [MARStatus.SELF_ADMINISTERED]: { label: 'Self-Administered', color: 'text-green-500', icon: CheckCircle },
  [MARStatus.ADMINISTERED_BY_GP]: { label: 'Administered by GP', color: 'text-green-500', icon: CheckCircle },
  [MARStatus.REFUSED]: { label: 'Refused', color: 'text-red-600', icon: XCircle },
  [MARStatus.NOT_ADMINISTERED]: { label: 'Not Administered', color: 'text-amber-600', icon: XCircle },
  [MARStatus.NOT_AVAILABLE]: { label: 'Not Available', color: 'text-amber-600', icon: AlertTriangle },
  [MARStatus.OTHER]: { label: 'Other', color: 'text-violet-600', icon: AlertTriangle },
  [MARStatus.WASTE]: { label: 'Waste', color: 'text-slate-500', icon: AlertTriangle },
};

const FORMULATIONS = Object.values(MedicationFormulation);
const ROUTES = Object.values(MedicationRoute);

interface MedicationForm {
  name: string;
  genericName: string;
  purpose: string;
  dosage: string;
  quantity: string;
  formulation: '' | MedicationFormulation;
  route: MedicationRoute;
  frequency: string;
  prescriber: string;
  isControlled: boolean;
  cdSchedule: string;
}

const emptyMedForm: MedicationForm = {
  name: '',
  genericName: '',
  purpose: '',
  dosage: '',
  quantity: '',
  formulation: '',
  route: MedicationRoute.ORAL,
  frequency: '',
  prescriber: '',
  isControlled: false,
  cdSchedule: 'schedule_2',
};

export function MARPage() {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const [serviceUserId, setServiceUserId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [chartRange, setChartRange] = useState(14);

  // Medication add/edit modal state
  const [medModalOpen, setMedModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [medForm, setMedForm] = useState<MedicationForm>(emptyMedForm);

  // Schedule doses modal state
  const [scheduleFor, setScheduleFor] = useState<Medication | null>(null);
  const [scheduleDate, setScheduleDate] = useState(todayStr);
  const [scheduleTimes, setScheduleTimes] = useState<string[]>(['08:00']);

  const qc = useQueryClient();

  const chartEndDate = new Date();
  const chartStartDate = new Date();
  chartStartDate.setDate(chartStartDate.getDate() - chartRange);

  const { data: serviceUsers } = useQuery<ServiceUser[]>({
    queryKey: ['service-users-options'],
    queryFn: async () =>
      (await apiClient.get('/service-users', { params: { limit: 100 } })).data.data,
  });

  const { data: medications, isLoading: medsLoading } = useQuery<Medication[]>({
    queryKey: ['mar-medications', serviceUserId],
    queryFn: async () =>
      (await apiClient.get(`/mar/medications?serviceUserId=${serviceUserId}`)).data,
    enabled: !!serviceUserId,
  });

  const { data: dailyData, isLoading: dailyLoading } = useQuery({
    queryKey: ['mar-daily', serviceUserId, selectedDate],
    queryFn: async () =>
      (await apiClient.get(`/mar/daily?serviceUserId=${serviceUserId}&date=${selectedDate}`)).data,
    enabled: !!serviceUserId,
  });

  const { data: chartData, isLoading: chartLoading } = useQuery<DailyMARSummary[]>({
    queryKey: ['mar-chart', serviceUserId, chartStartDate.toISOString(), chartEndDate.toISOString()],
    queryFn: async () =>
      (await apiClient.get(
        `/mar/chart?serviceUserId=${serviceUserId}&startDate=${chartStartDate.toISOString()}&endDate=${chartEndDate.toISOString()}`,
      )).data,
    enabled: !!serviceUserId,
  });

  const { data: missedMeds } = useQuery<MARRecord[]>({
    queryKey: ['mar-missed'],
    queryFn: async () => (await apiClient.get('/mar/missed')).data,
  });

  const medById = useMemo(
    () => new Map((medications ?? []).map((m) => [m.id, m])),
    [medications],
  );

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['mar-medications', serviceUserId] });
    qc.invalidateQueries({ queryKey: ['mar-daily'] });
    qc.invalidateQueries({ queryKey: ['mar-chart'] });
  };

  const saveMedication = useMutation({
    mutationFn: (payload: { id?: string; dto: Record<string, unknown> }) =>
      payload.id
        ? apiClient.patch(`/mar/medications/${payload.id}`, payload.dto)
        : apiClient.post('/mar/medications', payload.dto),
    onSuccess: (_res, vars) => {
      invalidate();
      setMedModalOpen(false);
      toast.success(vars.id ? 'Medication updated' : 'Medication added — carers can now see it');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'Failed to save medication'),
  });

  const discontinueMedication = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/mar/medications/${id}`),
    onSuccess: () => {
      invalidate();
      toast.success('Medication discontinued');
    },
    onError: () => toast.error('Failed to discontinue medication'),
  });

  const scheduleDoses = useMutation({
    mutationFn: (dto: { medicationId: string; serviceUserId: string; scheduledAt: string[] }) =>
      apiClient.post('/mar/schedule', dto),
    onSuccess: (res) => {
      invalidate();
      setScheduleFor(null);
      const created = Array.isArray(res.data) ? res.data.length : 0;
      toast.success(
        created > 0
          ? `${created} dose${created === 1 ? '' : 's'} scheduled — the carer will see them as due`
          : 'Those times were already scheduled',
      );
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'Failed to schedule doses'),
  });

  const openAddMed = () => {
    setEditingMed(null);
    setMedForm(emptyMedForm);
    setMedModalOpen(true);
  };

  const openEditMed = (med: Medication) => {
    setEditingMed(med);
    setMedForm({
      name: med.name,
      genericName: med.genericName ?? '',
      purpose: med.purpose ?? '',
      dosage: med.dosage,
      quantity: med.quantity ?? '',
      formulation: med.formulation ?? '',
      route: med.route,
      frequency: med.frequency,
      prescriber: med.prescriber ?? '',
      isControlled: med.isControlled,
      cdSchedule: med.cdSchedule ?? 'schedule_2',
    });
    setMedModalOpen(true);
  };

  const submitMedication = () => {
    if (!medForm.name.trim() || !medForm.dosage.trim() || !medForm.frequency.trim()) {
      toast.error('Name, dose and frequency are required');
      return;
    }
    saveMedication.mutate({
      id: editingMed?.id,
      dto: {
        serviceUserId,
        name: medForm.name.trim(),
        genericName: medForm.genericName.trim() || undefined,
        purpose: medForm.purpose.trim() || undefined,
        dosage: medForm.dosage.trim(),
        quantity: medForm.quantity.trim() || undefined,
        formulation: medForm.formulation || undefined,
        route: medForm.route,
        frequency: medForm.frequency.trim(),
        prescriber: medForm.prescriber.trim() || undefined,
        isControlled: medForm.isControlled,
        cdSchedule: medForm.isControlled ? medForm.cdSchedule : undefined,
      },
    });
  };

  const submitSchedule = () => {
    if (!scheduleFor) return;
    const validTimes = scheduleTimes.filter((t) => /^\d{2}:\d{2}$/.test(t));
    if (validTimes.length === 0) {
      toast.error('Add at least one time');
      return;
    }
    scheduleDoses.mutate({
      medicationId: scheduleFor.id,
      serviceUserId,
      scheduledAt: validTimes.map((t) => new Date(`${scheduleDate}T${t}:00`).toISOString()),
    });
  };

  const shiftDay = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-6">
      {/* Header + service user selector */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-secondary-50 dark:bg-secondary-900/30 rounded-xl flex items-center justify-center">
            <Pill className="w-5 h-5 text-secondary-500" />
          </div>
          <h1 className="page-header">Medication Administration Records</h1>
        </div>
        <select
          className="input w-64"
          value={serviceUserId}
          onChange={(e) => setServiceUserId(e.target.value)}
        >
          <option value="">Select a service user…</option>
          {(serviceUsers ?? []).map((su) => (
            <option key={su.id} value={su.id}>
              {su.firstName} {su.lastName}
            </option>
          ))}
        </select>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Compliance Today" value={dailyData?.summary ? `${dailyData.summary.complianceRate}%` : '—'} icon={TrendingUp} color="green" />
        <StatCard label="Given Today" value={dailyData?.summary?.given ?? '—'} icon={CheckCircle} color="green" />
        <StatCard label="Still Due Today" value={dailyData?.summary?.pending ?? '—'} icon={CalendarClock} color="blue" />
        <StatCard label="Refused Today" value={dailyData?.summary?.refused ?? '—'} icon={XCircle} color="red" />
      </div>

      {/* Medications — everything here is what the carer sees in their table */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-header flex items-center gap-2">
            <Pill className="w-4 h-4 text-secondary-500" />
            Medications
          </h2>
          <button
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!serviceUserId}
            onClick={openAddMed}
          >
            <Plus className="w-4 h-4" />
            Add Medication
          </button>
        </div>

        {!serviceUserId ? (
          <p className="text-center py-8 text-slate-400 text-sm">
            Select a service user to manage their medications
          </p>
        ) : medsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse bg-slate-100 rounded-lg" />
            ))}
          </div>
        ) : (medications ?? []).length === 0 ? (
          <p className="text-center py-8 text-slate-400 text-sm">
            No active medications — add the first one above
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  {['Medication', 'Function', 'Dose', 'Quantity', 'Formulation', 'Route', 'Frequency', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-100">
                {(medications ?? []).map((med) => (
                  <tr key={med.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{med.name}</div>
                      {med.isControlled && (
                        <span className="text-[10px] font-bold text-red-600 uppercase">Controlled drug</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[220px]">{med.purpose ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{med.dosage}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{med.quantity ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{med.formulation ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{med.route}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{med.frequency}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          title="Schedule doses"
                          className="p-1.5 rounded-lg hover:bg-violet-50 text-violet-600"
                          onClick={() => {
                            setScheduleFor(med);
                            setScheduleDate(todayStr);
                            setScheduleTimes(['08:00']);
                          }}
                        >
                          <CalendarClock className="w-4 h-4" />
                        </button>
                        <button
                          title="Edit"
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                          onClick={() => openEditMed(med)}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          title="Discontinue"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                          onClick={() => {
                            if (window.confirm(`Discontinue ${med.name}? Carers will no longer see it.`)) {
                              discontinueMedication.mutate(med.id);
                            }
                          }}
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Two-column: chart + missed meds */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                    chartRange === n ? 'bg-primary-500 text-white' : 'text-slate-500 hover:bg-slate-100'
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
                    {record.medication?.name ?? medById.get(record.medicationId)?.name ?? 'Medication'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Scheduled: {new Date(record.scheduledAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </p>
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
            <button onClick={() => shiftDay(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {formatDisplayDate(selectedDate)}
            </span>
            <button onClick={() => shiftDay(1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
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
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  {['Medication', 'Dose', 'Due', 'Completed', 'Status', 'Signed', 'Recorded', 'Reason'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-100">
                {dailyData.records.map((rec: MARRecord) => {
                  const med = medById.get(rec.medicationId);
                  const cfg = statusConfig[rec.status];
                  const Icon = cfg?.icon ?? CheckCircle;
                  const fmtTime = (iso?: string) =>
                    iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—';
                  return (
                    <tr key={rec.id}>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {med?.name ?? rec.medication?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {[med?.dosage ?? rec.medication?.dosage, med?.quantity].filter(Boolean).join(' · ') || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{fmtTime(rec.scheduledAt)}</td>
                      <td className="px-4 py-3 text-slate-600">{fmtTime(rec.administeredAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap ${cfg?.color ?? 'text-slate-500'}`}>
                          <Icon className="w-3.5 h-3.5" />
                          {cfg?.label ?? rec.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {rec.initials ?? '—'}
                        {rec.witnessInitials ? ` (W: ${rec.witnessInitials})` : ''}
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtTime(rec.recordedAt)}</td>
                      <td className="px-4 py-3 text-slate-500 max-w-[200px]">{rec.reasonNotGiven ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 text-sm">
            No MAR records for this date — use the calendar icon next to a medication to schedule doses
          </div>
        )}
      </div>

      {/* ── Add / Edit medication modal ── */}
      <Modal
        open={medModalOpen}
        onClose={() => setMedModalOpen(false)}
        title={editingMed ? `Edit ${editingMed.name}` : 'Add Medication'}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setMedModalOpen(false)}>Cancel</button>
            <button
              className="btn-primary disabled:opacity-50"
              disabled={saveMedication.isPending}
              onClick={submitMedication}
            >
              {saveMedication.isPending ? 'Saving…' : editingMed ? 'Save Changes' : 'Add Medication'}
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Medication name *">
            <input
              className="input w-full"
              value={medForm.name}
              onChange={(e) => setMedForm({ ...medForm, name: e.target.value })}
              placeholder="e.g. Paracetamol"
            />
          </Field>
          <Field label="Generic name">
            <input
              className="input w-full"
              value={medForm.genericName}
              onChange={(e) => setMedForm({ ...medForm, genericName: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Function — what is this medication for?">
              <input
                className="input w-full"
                value={medForm.purpose}
                onChange={(e) => setMedForm({ ...medForm, purpose: e.target.value })}
                placeholder="e.g. Pain relief and fever reduction"
              />
            </Field>
          </div>
          <Field label="Dose required *">
            <input
              className="input w-full"
              value={medForm.dosage}
              onChange={(e) => setMedForm({ ...medForm, dosage: e.target.value })}
              placeholder="e.g. 500mg"
            />
          </Field>
          <Field label="Quantity">
            <input
              className="input w-full"
              value={medForm.quantity}
              onChange={(e) => setMedForm({ ...medForm, quantity: e.target.value })}
              placeholder="e.g. 1 tablet / 5 ml"
            />
          </Field>
          <Field label="Formulation">
            <select
              className="input w-full capitalize"
              value={medForm.formulation}
              onChange={(e) => setMedForm({ ...medForm, formulation: e.target.value as MedicationFormulation | '' })}
            >
              <option value="">Not specified</option>
              {FORMULATIONS.map((f) => (
                <option key={f} value={f} className="capitalize">{f}</option>
              ))}
            </select>
          </Field>
          <Field label="Route *">
            <select
              className="input w-full capitalize"
              value={medForm.route}
              onChange={(e) => setMedForm({ ...medForm, route: e.target.value as MedicationRoute })}
            >
              {ROUTES.map((r) => (
                <option key={r} value={r} className="capitalize">{r}</option>
              ))}
            </select>
          </Field>
          <Field label="Frequency *">
            <input
              className="input w-full"
              value={medForm.frequency}
              onChange={(e) => setMedForm({ ...medForm, frequency: e.target.value })}
              placeholder="e.g. Twice daily"
            />
          </Field>
          <Field label="Prescriber">
            <input
              className="input w-full"
              value={medForm.prescriber}
              onChange={(e) => setMedForm({ ...medForm, prescriber: e.target.value })}
              placeholder="e.g. Dr Patel"
            />
          </Field>
          <div className="sm:col-span-2 flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={medForm.isControlled}
                onChange={(e) => setMedForm({ ...medForm, isControlled: e.target.checked })}
              />
              Controlled drug (witness required on administration)
            </label>
            {medForm.isControlled && (
              <select
                className="input w-40"
                value={medForm.cdSchedule}
                onChange={(e) => setMedForm({ ...medForm, cdSchedule: e.target.value })}
              >
                {['schedule_2', 'schedule_3', 'schedule_4', 'schedule_5'].map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </Modal>

      {/* ── Schedule doses modal ── */}
      <Modal
        open={!!scheduleFor}
        onClose={() => setScheduleFor(null)}
        title={scheduleFor ? `Schedule ${scheduleFor.name}` : ''}
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setScheduleFor(null)}>Cancel</button>
            <button
              className="btn-primary disabled:opacity-50"
              disabled={scheduleDoses.isPending}
              onClick={submitSchedule}
            >
              {scheduleDoses.isPending ? 'Scheduling…' : 'Schedule Doses'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            The carer will see each dose as <span className="font-medium text-violet-600">due</span> at
            these exact times, with recording options unlocked.
          </p>
          <Field label="Date">
            <input
              type="date"
              className="input w-full"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
            />
          </Field>
          <Field label="Times">
            <div className="space-y-2">
              {scheduleTimes.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="time"
                    className="input flex-1"
                    value={t}
                    onChange={(e) =>
                      setScheduleTimes(scheduleTimes.map((x, j) => (j === i ? e.target.value : x)))
                    }
                  />
                  {scheduleTimes.length > 1 && (
                    <button
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                      onClick={() => setScheduleTimes(scheduleTimes.filter((_, j) => j !== i))}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
                onClick={() => setScheduleTimes([...scheduleTimes, '12:00'])}
              >
                <Plus className="w-3.5 h-3.5" /> Add another time
              </button>
            </div>
          </Field>
        </div>
      </Modal>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
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
