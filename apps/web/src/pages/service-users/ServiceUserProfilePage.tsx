import { useState, type ReactNode } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, MapPin, AlertTriangle, Pill, FileText,
  ClipboardList, Plus, CheckCircle, CalendarCheck, Phone, Mail,
  Users, Building2, Cross, ChevronLeft, ChevronRight, ClipboardCheck, ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal, Badge } from '@my-cura/ui-web';
import { apiClient } from '../../services/api.client';
import { formatDisplayDate } from '@my-cura/shared-utils';
import { age, type ServiceUser } from './ServiceUsersPage';

const SECTION_LABELS: Record<string, string> = {
  personalCare: 'Personal Care',
  nutrition: 'Nutrition',
  mobility: 'Mobility',
  continence: 'Continence',
  communication: 'Communication',
  sleep: 'Sleep',
  socialAndWellbeing: 'Social & Wellbeing',
  medicationManagement: 'Medication Management',
  behaviourSupport: 'Behaviour Support',
  palliativeCare: 'Palliative Care',
};

interface CarePlan {
  id: string;
  version: number;
  title: string;
  status: 'draft' | 'active' | 'archived';
  content: Record<string, string>;
  goals?: string[];
  reviewedAt?: string;
  nextReviewAt?: string;
  createdAt: string;
}

interface VisitNote {
  id: string;
  createdAt: string;
  narrative?: string;
  mood?: string;
  appetite?: string;
  painLevel?: number;
  fluidIntakeMl?: number;
  escalationLevel: string;
  escalationStatus: string;
  escalationNotes?: string;
}

const PLAN_STATUS_COLOR: Record<string, 'green' | 'amber' | 'gray'> = {
  active: 'green',
  draft: 'amber',
  archived: 'gray',
};

interface CareDocEntry {
  id: string;
  documentation: string;
  execution: 'executed' | 'partially_executed' | 'not_executed' | 'other';
  reason: string;
  careWorkerName: string;
  createdAt: string;
}

interface CareDocSheet {
  allocatedHours: number;
  careDayStart: string;
  slots: { slotAt: string; entry: CareDocEntry | null }[];
}

const EXECUTION_STYLE: Record<string, { label: string; cls: string }> = {
  executed: { label: 'Executed', cls: 'bg-green-100 text-green-700' },
  partially_executed: { label: 'Partially Executed', cls: 'bg-amber-100 text-amber-700' },
  not_executed: { label: 'Not Executed', cls: 'bg-red-100 text-red-700' },
  other: { label: 'Other', cls: 'bg-violet-100 text-violet-700' },
};

const REASON_LABELS: Record<string, string> = {
  fully_executed: 'Fully executed', adequate: 'Adequate', satisfactory: 'Satisfactory',
  insufficient: 'Insufficient', partially_executed: 'Partially executed',
  refused: 'Refused', other: 'Other', not_required: 'Not required',
};

/** Same timing rules as the carer app: orange due, red 3h missed, green done. */
function slotTone(slotAt: string, hasEntry: boolean): { label: string; cls: string } {
  if (hasEntry) return { label: 'Done', cls: 'text-green-600' };
  const t = new Date(slotAt).getTime();
  const n = Date.now();
  if (n < t - 15 * 60 * 1000) return { label: 'Upcoming', cls: 'text-slate-400' };
  if (n <= t + 3 * 60 * 60 * 1000) return { label: 'Due', cls: 'text-amber-600' };
  return { label: 'Missed', cls: 'text-red-600' };
}

export function ServiceUserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'careplan' | 'notes' | 'caredoc' | 'consent'>('caredoc');
  const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [planForm, setPlanForm] = useState({
    title: '',
    goals: '',
    nextReviewAt: '',
    sections: {} as Record<string, string>,
  });

  const { data: su, isLoading } = useQuery<ServiceUser>({
    queryKey: ['service-user', id],
    queryFn: async () => (await apiClient.get(`/service-users/${id}`)).data,
    enabled: !!id,
  });

  const { data: plans } = useQuery<CarePlan[]>({
    queryKey: ['care-plans', id],
    queryFn: async () => (await apiClient.get(`/care-plans/service-user/${id}`)).data,
    enabled: !!id,
  });

  const { data: notes } = useQuery<{ data: VisitNote[]; total: number }>({
    queryKey: ['visit-notes', id],
    queryFn: async () => (await apiClient.get(`/visit-notes/service-user/${id}?limit=30`)).data,
    enabled: !!id,
  });

  const { data: careDoc } = useQuery<CareDocSheet>({
    queryKey: ['care-doc', id, docDate],
    queryFn: async () =>
      (await apiClient.get(`/visit-notes/care-doc?serviceUserId=${id}&date=${docDate}`)).data,
    enabled: !!id,
    refetchInterval: 60_000, // live colour transitions for managers watching today
  });

  const createPlan = useMutation({
    mutationFn: (dto: Record<string, unknown>) => apiClient.post('/care-plans', dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['care-plans', id] });
      setPlanModalOpen(false);
      toast.success('Draft care plan created — activate it when ready');
    },
    onError: () => toast.error('Failed to create care plan'),
  });

  const activatePlan = useMutation({
    mutationFn: (planId: string) => apiClient.patch(`/care-plans/${planId}/activate`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['care-plans', id] });
      toast.success('Care plan activated — carers now see this version');
    },
    onError: () => toast.error('Failed to activate'),
  });

  const reviewPlan = useMutation({
    mutationFn: (payload: { planId: string; nextReviewAt?: string }) =>
      apiClient.patch(`/care-plans/${payload.planId}/review`, { nextReviewAt: payload.nextReviewAt }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['care-plans', id] });
      toast.success('Review recorded');
    },
    onError: () => toast.error('Failed to record review'),
  });

  const submitPlan = () => {
    if (!planForm.title.trim()) {
      toast.error('Give the care plan a title');
      return;
    }
    const content: Record<string, string> = {};
    for (const [k, v] of Object.entries(planForm.sections)) {
      if (v.trim()) content[k] = v.trim();
    }
    if (Object.keys(content).length === 0) {
      toast.error('Fill in at least one care section');
      return;
    }
    createPlan.mutate({
      serviceUserId: id,
      title: planForm.title.trim(),
      content,
      goals: planForm.goals.split('\n').map((g) => g.trim()).filter(Boolean),
      nextReviewAt: planForm.nextReviewAt || undefined,
    });
  };

  if (isLoading || !su) {
    return <div className="card p-8 animate-pulse h-40" />;
  }

  return (
    <div className="space-y-6">
      <button
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
        onClick={() => navigate('/service-users')}
      >
        <ArrowLeft className="w-4 h-4" /> All service users
      </button>

      {/* Profile header */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {su.photoUrl ? (
              <img
                src={su.photoUrl}
                alt={`${su.firstName} ${su.lastName}`}
                className="w-16 h-16 rounded-2xl object-cover border border-slate-200"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
                <span className="text-lg font-bold text-primary-500">
                  {su.firstName?.[0]}{su.lastName?.[0]}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {su.firstName} {su.lastName}
              </h1>
              <p className="text-sm text-slate-500">
                {su.dateOfBirth ? `${age(su.dateOfBirth)} years old · born ${formatDisplayDate(su.dateOfBirth)}` : ''}
                {su.gender ? ` · ${su.gender.replace(/_/g, ' ')}` : ''}
                {su.careCommencedOn ? ` · care since ${formatDisplayDate(su.careCommencedOn)}` : ''}
              </p>
              <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5" />
                {su.address ? `${su.address.line1}, ${su.address.city}, ${su.address.postcode}` : 'No address'}
                {su.address?.lat ? ` (${su.address.lat.toFixed(4)}, ${su.address.lon.toFixed(4)})` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {su.careLevel && (
              <Badge color={su.careLevel === 'low' ? 'green' : su.careLevel === 'medium' ? 'amber' : 'red'} dot>
                <span className="capitalize">{su.careLevel} care</span>
              </Badge>
            )}
            <Badge color={su.status === 'active' ? 'green' : 'gray'} dot>
              <span className="capitalize">{su.status}</span>
            </Badge>
            <Link to="/mar" className="btn-secondary flex items-center gap-1.5 text-sm">
              <Pill className="w-4 h-4" /> MAR Chart
            </Link>
          </div>
        </div>

        {su.conditionSummary && (
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 bg-primary-50/50 dark:bg-primary-900/20 rounded-lg p-3 leading-relaxed">
            {su.conditionSummary}
          </p>
        )}

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <InfoCard icon={<Phone className="w-4 h-4" />} title="Contact">
            {su.contactDetails?.phone && <p>{su.contactDetails.phone}</p>}
            {su.contactDetails?.email && (
              <p className="flex items-center gap-1"><Mail className="w-3 h-3" />{su.contactDetails.email}</p>
            )}
            {!su.contactDetails?.phone && !su.contactDetails?.email && <p className="text-slate-400">Not set</p>}
          </InfoCard>
          <InfoCard icon={<Users className="w-4 h-4" />} title="Emergency contact">
            {(su.emergencyContacts?.length ?? 0) > 0 ? (
              su.emergencyContacts!.map((ec, i) => (
                <p key={i}>
                  <span className="font-medium">{ec.name}</span> ({ec.relationship}) — {ec.phone}
                </p>
              ))
            ) : (
              <p className="text-slate-400">Not set</p>
            )}
          </InfoCard>
          <InfoCard icon={<Building2 className="w-4 h-4" />} title="Registered hospital">
            {su.hospitalContact ? (
              <>
                <p className="font-medium">{su.hospitalContact.name}</p>
                {su.hospitalContact.ward && <p>{su.hospitalContact.ward}</p>}
                {su.hospitalContact.phone && <p>{su.hospitalContact.phone}</p>}
              </>
            ) : (
              <p className="text-slate-400">Not set</p>
            )}
          </InfoCard>
          <InfoCard icon={<Cross className="w-4 h-4" />} title="Pharmacy">
            {su.pharmacyContact ? (
              <>
                <p className="font-medium">{su.pharmacyContact.name}</p>
                {su.pharmacyContact.phone && <p>{su.pharmacyContact.phone}</p>}
                {su.pharmacyContact.address && <p>{su.pharmacyContact.address}</p>}
              </>
            ) : (
              <p className="text-slate-400">Not set</p>
            )}
          </InfoCard>
        </div>

        {((su.allergies?.length ?? 0) > 0 || (su.medicalConditions?.length ?? 0) > 0) && (
          <div className="mt-5 flex flex-wrap gap-6">
            {(su.allergies?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Allergies
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {su.allergies!.map((a) => (
                    <span key={a} className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-xs font-medium">{a}</span>
                  ))}
                </div>
              </div>
            )}
            {(su.medicalConditions?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Medical conditions</p>
                <div className="flex flex-wrap gap-1.5">
                  {su.medicalConditions!.map((c) => (
                    <span key={c} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">{c}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <TabButton active={tab === 'caredoc'} onClick={() => setTab('caredoc')} icon={<ClipboardCheck className="w-4 h-4" />}>
          Care Documentation
        </TabButton>
        <TabButton active={tab === 'careplan'} onClick={() => setTab('careplan')} icon={<ClipboardList className="w-4 h-4" />}>
          Care Plan
        </TabButton>
        <TabButton active={tab === 'consent'} onClick={() => setTab('consent')} icon={<ShieldCheck className="w-4 h-4" />}>
          Consent
        </TabButton>
        <TabButton active={tab === 'notes'} onClick={() => setTab('notes')} icon={<FileText className="w-4 h-4" />}>
          Visit Notes {notes?.total ? `(${notes.total})` : ''}
        </TabButton>
      </div>

      {tab === 'caredoc' && (
        <div className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="section-header flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-primary-500" />
              Hourly Care Documentation
            </h2>
            <div className="flex items-center gap-2">
              <button
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                onClick={() => {
                  const d = new Date(docDate); d.setDate(d.getDate() - 1);
                  setDocDate(d.toISOString().split('T')[0]);
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {formatDisplayDate(docDate)}
              </span>
              <button
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                onClick={() => {
                  const d = new Date(docDate); d.setDate(d.getDate() + 1);
                  setDocDate(d.toISOString().split('T')[0]);
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!careDoc || careDoc.allocatedHours === 0 ? (
            <p className="text-center py-8 text-slate-400 text-sm">
              No care hours allocated — set them in this person's edit form and the
              carer app will require hourly documentation.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-4 mb-4 text-sm">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {careDoc.slots.filter((s) => s.entry).length}/{careDoc.allocatedHours} hours documented
                </span>
                <span className="text-green-600">
                  {careDoc.slots.filter((s) => s.entry?.execution === 'executed').length} executed
                </span>
                <span className="text-amber-600">
                  {careDoc.slots.filter((s) => s.entry?.execution === 'partially_executed').length} partial
                </span>
                <span className="text-red-600">
                  {careDoc.slots.filter((s) => s.entry?.execution === 'not_executed').length} not executed
                  {' · '}
                  {careDoc.slots.filter((s) => !s.entry && slotTone(s.slotAt, false).label === 'Missed').length} missed
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      {['Hour', 'Status', 'Care Provided', 'Documentation', 'Carer', 'Saved'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-100">
                    {careDoc.slots.map((slot) => {
                      const tone = slotTone(slot.slotAt, !!slot.entry);
                      const exec = slot.entry ? EXECUTION_STYLE[slot.entry.execution] : null;
                      return (
                        <tr key={slot.slotAt}>
                          <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {new Date(slot.slotAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className={`px-4 py-3 font-semibold whitespace-nowrap ${tone.cls}`}>{tone.label}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {exec ? (
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${exec.cls}`}>
                                {exec.label} · {REASON_LABELS[slot.entry!.reason] ?? slot.entry!.reason}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-600 max-w-[320px]">
                            {slot.entry?.documentation ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                            {slot.entry?.careWorkerName ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                            {slot.entry
                              ? new Date(slot.entry.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                              : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'careplan' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              className="btn-primary flex items-center gap-2"
              onClick={() => {
                setPlanForm({ title: '', goals: '', nextReviewAt: '', sections: {} });
                setPlanModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4" /> New Draft Version
            </button>
          </div>
          {(plans ?? []).length === 0 ? (
            <div className="card p-10 text-center text-slate-400">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No care plan yet — create the first draft</p>
            </div>
          ) : (
            (plans ?? []).map((plan) => (
              <div key={plan.id} className="card p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                      v{plan.version} — {plan.title}
                    </h3>
                    <Badge color={PLAN_STATUS_COLOR[plan.status] ?? 'gray'} dot>
                      <span className="capitalize">{plan.status}</span>
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {plan.status === 'draft' && (
                      <button
                        className="btn-primary flex items-center gap-1.5 text-sm"
                        onClick={() => activatePlan.mutate(plan.id)}
                      >
                        <CheckCircle className="w-4 h-4" /> Activate
                      </button>
                    )}
                    {plan.status === 'active' && (
                      <button
                        className="btn-secondary flex items-center gap-1.5 text-sm"
                        onClick={() => {
                          const next = window.prompt('Next review date (YYYY-MM-DD), or leave blank:');
                          if (next !== null) reviewPlan.mutate({ planId: plan.id, nextReviewAt: next || undefined });
                        }}
                      >
                        <CalendarCheck className="w-4 h-4" /> Record Review
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-xs text-slate-400 mb-4">
                  Created {formatDisplayDate(plan.createdAt)}
                  {plan.reviewedAt ? ` · Last reviewed ${formatDisplayDate(plan.reviewedAt)}` : ''}
                  {plan.nextReviewAt ? ` · Next review ${formatDisplayDate(plan.nextReviewAt)}` : ''}
                </div>

                {(plan.goals?.length ?? 0) > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Goals</p>
                    <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-300 space-y-0.5">
                      {plan.goals!.map((g, i) => <li key={i}>{g}</li>)}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(plan.content ?? {}).map(([key, value]) => (
                    <div key={key} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-primary-600 uppercase tracking-wide mb-1">
                        {SECTION_LABELS[key] ?? key}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'consent' && <ConsentSection suId={id!} />}

      {tab === 'notes' && (
        <div className="space-y-3">
          {(notes?.data ?? []).length === 0 ? (
            <div className="card p-10 text-center text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No visit notes yet — carers write these after visits</p>
            </div>
          ) : (
            (notes?.data ?? []).map((n) => (
              <div key={n.id} className="card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {new Date(n.createdAt).toLocaleString('en-GB', {
                      weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                  {n.escalationLevel !== 'none' && (
                    <Badge color={n.escalationStatus === 'resolved' || n.escalationStatus === 'closed' ? 'green' : 'red'} dot>
                      <span className="capitalize">{n.escalationLevel} escalation · {n.escalationStatus}</span>
                    </Badge>
                  )}
                </div>
                {n.narrative && <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">{n.narrative}</p>}
                <div className="flex flex-wrap gap-2 text-xs">
                  {n.mood && <Chip label={`Mood: ${n.mood}`} />}
                  {n.appetite && <Chip label={`Appetite: ${n.appetite}`} />}
                  {n.painLevel != null && <Chip label={`Pain: ${n.painLevel}/10`} />}
                  {n.fluidIntakeMl != null && <Chip label={`Fluids: ${n.fluidIntakeMl}ml`} />}
                </div>
                {n.escalationNotes && (
                  <p className="text-xs text-slate-500 italic mt-3 whitespace-pre-wrap">{n.escalationNotes}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* New care plan draft modal */}
      <Modal
        open={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        title="New Care Plan Draft"
        size="xl"
        footer={
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setPlanModalOpen(false)}>Cancel</button>
            <button className="btn-primary disabled:opacity-50" disabled={createPlan.isPending} onClick={submitPlan}>
              {createPlan.isPending ? 'Creating…' : 'Create Draft'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Title *</label>
              <input
                className="input w-full"
                placeholder="e.g. Care plan following hospital discharge"
                value={planForm.title}
                onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Next review date</label>
              <input
                type="date"
                className="input w-full"
                value={planForm.nextReviewAt}
                onChange={(e) => setPlanForm({ ...planForm, nextReviewAt: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Goals (one per line)</label>
            <textarea
              className="input w-full min-h-[70px]"
              placeholder={'Maintain independence at mealtimes\nWalk to the day centre twice a week'}
              value={planForm.goals}
              onChange={(e) => setPlanForm({ ...planForm, goals: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(SECTION_LABELS).map(([key, label]) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
                <textarea
                  className="input w-full min-h-[60px]"
                  value={planForm.sections[key] ?? ''}
                  onChange={(e) =>
                    setPlanForm({ ...planForm, sections: { ...planForm.sections, [key]: e.target.value } })
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}

function InfoCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
        {icon} {title}
      </p>
      <div className="text-sm text-slate-600 dark:text-slate-300 space-y-0.5">{children}</div>
    </div>
  );
}

function TabButton({ active, onClick, icon, children }: {
  active: boolean; onClick: () => void; icon: ReactNode; children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
        active
          ? 'bg-primary-500 text-white'
          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 capitalize">
      {label}
    </span>
  );
}

// ── Consent (append-only, Mental-Capacity-Act aware) ─────────────────────────

const CONSENT_TYPES: { key: string; label: string }[] = [
  { key: 'care_and_support', label: 'Care & support' },
  { key: 'data_processing', label: 'Data processing' },
  { key: 'data_sharing', label: 'Data sharing (GP, hospital, pharmacy)' },
  { key: 'medication', label: 'Medication administration' },
  { key: 'photography', label: 'Photography' },
];

const GIVEN_BY_LABELS: Record<string, string> = {
  self: 'The person themselves',
  attorney: 'Attorney (LPA)',
  deputy: 'Court-appointed deputy',
  best_interests: 'Best-interests decision',
};

interface ConsentEvent {
  id: string;
  consentType: string;
  status: 'granted' | 'refused' | 'withdrawn';
  givenBy: string;
  givenByName?: string | null;
  capacityAssessed: boolean;
  notes?: string | null;
  reviewBy?: string | null;
  recordedAt: string;
}

const CONSENT_BADGE: Record<string, 'green' | 'red' | 'amber' | 'gray'> = {
  granted: 'green', refused: 'red', withdrawn: 'amber',
};

function ConsentSection({ suId }: { suId: string }) {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    consentType: 'care_and_support',
    status: 'granted',
    givenBy: 'self',
    givenByName: '',
    capacityAssessed: false,
    notes: '',
    reviewBy: '',
  });

  const { data } = useQuery<{ current: Record<string, ConsentEvent>; history: ConsentEvent[] }>({
    queryKey: ['consents', suId],
    queryFn: async () => (await apiClient.get(`/service-users/${suId}/consents`)).data,
  });

  const record = useMutation({
    mutationFn: async () =>
      apiClient.post(`/service-users/${suId}/consents`, {
        ...form,
        givenByName: form.givenByName || undefined,
        notes: form.notes || undefined,
        reviewBy: form.reviewBy || undefined,
      }),
    onSuccess: () => {
      toast.success('Consent decision recorded');
      setFormOpen(false);
      void qc.invalidateQueries({ queryKey: ['consents', suId] });
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? 'Could not record consent'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Every decision is stored permanently — withdrawing consent adds to the history, nothing is ever erased.
        </p>
        <button className="btn-primary flex items-center gap-2" onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4" /> Record decision
        </button>
      </div>

      <div className="card divide-y divide-slate-100 dark:divide-slate-700">
        {CONSENT_TYPES.map(({ key, label }) => {
          const cur = data?.current?.[key];
          return (
            <div key={key} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
                {cur && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {GIVEN_BY_LABELS[cur.givenBy] ?? cur.givenBy}
                    {cur.givenByName ? ` — ${cur.givenByName}` : ''} ·{' '}
                    {formatDisplayDate(cur.recordedAt)}
                    {cur.reviewBy ? ` · review by ${formatDisplayDate(cur.reviewBy)}` : ''}
                  </p>
                )}
              </div>
              {cur ? (
                <Badge color={CONSENT_BADGE[cur.status] ?? 'gray'}>{cur.status}</Badge>
              ) : (
                <Badge color="gray">not recorded</Badge>
              )}
            </div>
          );
        })}
      </div>

      {(data?.history?.length ?? 0) > 0 && (
        <div className="card p-5">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">History</p>
          <div className="space-y-2">
            {data!.history.map((h) => (
              <div key={h.id} className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-medium">{new Date(h.recordedAt).toLocaleString('en-GB')}</span>
                <Chip label={CONSENT_TYPES.find((t) => t.key === h.consentType)?.label ?? h.consentType} />
                <Badge color={CONSENT_BADGE[h.status] ?? 'gray'}>{h.status}</Badge>
                <span>{GIVEN_BY_LABELS[h.givenBy] ?? h.givenBy}{h.givenByName ? ` (${h.givenByName})` : ''}</span>
                {h.capacityAssessed && <Chip label="capacity assessed" />}
                {h.notes && <span className="italic">“{h.notes}”</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Record a consent decision">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">What is being decided?</label>
            <select className="input" value={form.consentType}
              onChange={(e) => setForm({ ...form, consentType: e.target.value })}>
              {CONSENT_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Decision</label>
            <select className="input" value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="granted">Consent given</option>
              <option value="refused">Consent refused</option>
              <option value="withdrawn">Consent withdrawn</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Decided by</label>
            <select className="input" value={form.givenBy}
              onChange={(e) => setForm({ ...form, givenBy: e.target.value })}>
              {Object.entries(GIVEN_BY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          {form.givenBy !== 'self' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Decision-maker's name</label>
                <input className="input" value={form.givenByName} placeholder="e.g. Margaret Whitfield (daughter, LPA)"
                  onChange={(e) => setForm({ ...form, givenByName: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300" checked={form.capacityAssessed}
                  onChange={(e) => setForm({ ...form, capacityAssessed: e.target.checked })} />
                A mental-capacity assessment was carried out for this decision
              </label>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Review by (optional)</label>
            <input type="date" className="input" value={form.reviewBy}
              onChange={(e) => setForm({ ...form, reviewBy: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes (optional)</label>
            <textarea className="input" rows={2} value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button className="btn-secondary" onClick={() => setFormOpen(false)}>Cancel</button>
            <button className="btn-primary" disabled={record.isPending} onClick={() => record.mutate()}>
              {record.isPending ? 'Saving…' : 'Record decision'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
