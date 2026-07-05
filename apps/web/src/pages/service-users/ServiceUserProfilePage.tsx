import { useState, type ReactNode } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Heart, MapPin, AlertTriangle, Pill, FileText,
  ClipboardList, Plus, CheckCircle, CalendarCheck,
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

export function ServiceUserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'careplan' | 'notes'>('careplan');
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
            <div className="w-14 h-14 rounded-2xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
              <Heart className="w-6 h-6 text-primary-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {su.firstName} {su.lastName}
              </h1>
              <p className="text-sm text-slate-500">
                {su.dateOfBirth ? `${age(su.dateOfBirth)} years old · born ${formatDisplayDate(su.dateOfBirth)}` : ''}
              </p>
              <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5" />
                {su.address ? `${su.address.line1}, ${su.address.city}, ${su.address.postcode}` : 'No address'}
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
        <TabButton active={tab === 'careplan'} onClick={() => setTab('careplan')} icon={<ClipboardList className="w-4 h-4" />}>
          Care Plan
        </TabButton>
        <TabButton active={tab === 'notes'} onClick={() => setTab('notes')} icon={<FileText className="w-4 h-4" />}>
          Visit Notes {notes?.total ? `(${notes.total})` : ''}
        </TabButton>
      </div>

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
