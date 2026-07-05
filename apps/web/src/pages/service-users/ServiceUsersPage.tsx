import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, Plus, Search, Pencil, Archive, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal, Badge } from '@my-cura/ui-web';
import { apiClient } from '../../services/api.client';

export interface ServiceUser {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  status: 'active' | 'inactive' | 'hospital' | 'deceased';
  careLevel?: 'low' | 'medium' | 'high' | 'critical';
  fundingSource?: 'nhs' | 'local_authority' | 'private' | 'combined';
  address: {
    line1: string;
    line2?: string;
    city: string;
    postcode: string;
    lat: number;
    lon: number;
  };
  allergies?: string[];
  medicalConditions?: string[];
  mobilityNeeds?: string;
  communicationNeeds?: string;
  careHoursPerDay?: number;
  careDayStart?: string;
}

const CARE_LEVEL_COLOR: Record<string, 'green' | 'amber' | 'red' | 'purple'> = {
  low: 'green',
  medium: 'amber',
  high: 'red',
  critical: 'purple',
};

interface SUForm {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  line1: string;
  line2: string;
  city: string;
  postcode: string;
  lat: string;
  lon: string;
  careLevel: '' | ServiceUser['careLevel'];
  fundingSource: '' | ServiceUser['fundingSource'];
  allergies: string;
  medicalConditions: string;
  mobilityNeeds: string;
  communicationNeeds: string;
  careHoursPerDay: string;
  careDayStart: string;
}

const emptyForm: SUForm = {
  firstName: '', lastName: '', dateOfBirth: '',
  line1: '', line2: '', city: '', postcode: '', lat: '', lon: '',
  careLevel: '', fundingSource: '',
  allergies: '', medicalConditions: '', mobilityNeeds: '', communicationNeeds: '',
  careHoursPerDay: '', careDayStart: '08:00',
};

export function age(dob: string): number {
  const b = new Date(dob);
  const now = new Date();
  let a = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) a--;
  return a;
}

export function ServiceUsersPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceUser | null>(null);
  const [form, setForm] = useState<SUForm>(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['service-users', search, page],
    queryFn: async () =>
      (await apiClient.get('/service-users', {
        params: { search: search || undefined, page, limit: 20 },
      })).data as { data: ServiceUser[]; total: number; totalPages: number },
  });

  const save = useMutation({
    mutationFn: (payload: { id?: string; dto: Record<string, unknown> }) =>
      payload.id
        ? apiClient.patch(`/service-users/${payload.id}`, payload.dto)
        : apiClient.post('/service-users', payload.dto),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ['service-users'] });
      setModalOpen(false);
      toast.success(vars.id ? 'Service user updated' : 'Service user added');
    },
    onError: (err: { response?: { data?: { message?: string | string[] } } }) => {
      const m = err.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m ?? 'Failed to save');
    },
  });

  const archive = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/service-users/${id}/archive`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-users'] });
      toast.success('Service user archived');
    },
    onError: () => toast.error('Failed to archive'),
  });

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (su: ServiceUser) => {
    setEditing(su);
    setForm({
      firstName: su.firstName,
      lastName: su.lastName,
      dateOfBirth: su.dateOfBirth?.split('T')[0] ?? '',
      line1: su.address?.line1 ?? '',
      line2: su.address?.line2 ?? '',
      city: su.address?.city ?? '',
      postcode: su.address?.postcode ?? '',
      lat: su.address?.lat != null ? String(su.address.lat) : '',
      lon: su.address?.lon != null ? String(su.address.lon) : '',
      careLevel: su.careLevel ?? '',
      fundingSource: su.fundingSource ?? '',
      allergies: (su.allergies ?? []).join(', '),
      medicalConditions: (su.medicalConditions ?? []).join(', '),
      mobilityNeeds: su.mobilityNeeds ?? '',
      communicationNeeds: su.communicationNeeds ?? '',
      careHoursPerDay: su.careHoursPerDay != null ? String(su.careHoursPerDay) : '',
      careDayStart: su.careDayStart ?? '08:00',
    });
    setModalOpen(true);
  };

  const submit = () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.dateOfBirth) {
      toast.error('Name and date of birth are required');
      return;
    }
    if (!form.line1.trim() || !form.city.trim() || !form.postcode.trim()) {
      toast.error('Address line 1, city and postcode are required');
      return;
    }
    const csv = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
    save.mutate({
      id: editing?.id,
      dto: {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        dateOfBirth: form.dateOfBirth,
        address: {
          line1: form.line1.trim(),
          line2: form.line2.trim() || undefined,
          city: form.city.trim(),
          postcode: form.postcode.trim().toUpperCase(),
          lat: form.lat ? Number(form.lat) : 0,
          lon: form.lon ? Number(form.lon) : 0,
        },
        careLevel: form.careLevel || undefined,
        fundingSource: form.fundingSource || undefined,
        allergies: csv(form.allergies),
        medicalConditions: csv(form.medicalConditions),
        mobilityNeeds: form.mobilityNeeds.trim() || undefined,
        communicationNeeds: form.communicationNeeds.trim() || undefined,
        careHoursPerDay: form.careHoursPerDay ? Number(form.careHoursPerDay) : undefined,
        careDayStart: form.careHoursPerDay ? form.careDayStart : undefined,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
            <Heart className="w-5 h-5 text-primary-500" />
          </div>
          <h1 className="page-header">Service Users</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9 w-64"
              placeholder="Search by name…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <button className="btn-primary flex items-center gap-2" onClick={openAdd}>
            <Plus className="w-4 h-4" />
            Add Service User
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse bg-slate-100 rounded-lg" />
            ))}
          </div>
        ) : (data?.data ?? []).length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <Heart className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{search ? 'No matches for your search' : 'No service users yet — add the first one'}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                {['Name', 'Age', 'Address', 'Care Level', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {(data?.data ?? []).map((su) => (
                <tr
                  key={su.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                  onClick={() => navigate(`/service-users/${su.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                    {su.firstName} {su.lastName}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{su.dateOfBirth ? age(su.dateOfBirth) : '—'}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {su.address ? `${su.address.line1}, ${su.address.postcode}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {su.careLevel ? (
                      <Badge color={CARE_LEVEL_COLOR[su.careLevel] ?? 'gray'} dot>
                        <span className="capitalize">{su.careLevel}</span>
                      </Badge>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={su.status === 'active' ? 'green' : 'gray'} dot>
                      <span className="capitalize">{su.status}</span>
                    </Badge>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        title="Edit"
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                        onClick={() => openEdit(su)}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {su.status === 'active' && (
                        <button
                          title="Archive"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                          onClick={() => {
                            if (window.confirm(`Archive ${su.firstName} ${su.lastName}?`)) archive.mutate(su.id);
                          }}
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        title="Open profile"
                        className="p-1.5 rounded-lg hover:bg-primary-50 text-primary-500"
                        onClick={() => navigate(`/service-users/${su.id}`)}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {(data?.totalPages ?? 0) > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700 text-sm">
            <span className="text-slate-500">{data?.total} service users</span>
            <div className="flex gap-2">
              <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              <button className="btn-secondary" disabled={page >= (data?.totalPages ?? 1)} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${editing.firstName} ${editing.lastName}` : 'Add Service User'}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary disabled:opacity-50" disabled={save.isPending} onClick={submit}>
              {save.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Add Service User'}
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <F label="First name *"><input className="input w-full" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></F>
          <F label="Last name *"><input className="input w-full" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></F>
          <F label="Date of birth *"><input type="date" className="input w-full" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} /></F>
          <F label="Care level">
            <select className="input w-full capitalize" value={form.careLevel ?? ''} onChange={(e) => setForm({ ...form, careLevel: e.target.value as SUForm['careLevel'] })}>
              <option value="">Not set</option>
              {['low', 'medium', 'high', 'critical'].map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </F>
          <F label="Address line 1 *"><input className="input w-full" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} /></F>
          <F label="Address line 2"><input className="input w-full" value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} /></F>
          <F label="City *"><input className="input w-full" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></F>
          <F label="Postcode *"><input className="input w-full" value={form.postcode} onChange={(e) => setForm({ ...form, postcode: e.target.value })} /></F>
          <F label="Latitude (for GPS clock-in)"><input className="input w-full" placeholder="e.g. 53.4451" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} /></F>
          <F label="Longitude (for GPS clock-in)"><input className="input w-full" placeholder="e.g. -2.2189" value={form.lon} onChange={(e) => setForm({ ...form, lon: e.target.value })} /></F>
          <F label="Funding source">
            <select className="input w-full" value={form.fundingSource ?? ''} onChange={(e) => setForm({ ...form, fundingSource: e.target.value as SUForm['fundingSource'] })}>
              <option value="">Not set</option>
              <option value="nhs">NHS</option>
              <option value="local_authority">Local authority</option>
              <option value="private">Private</option>
              <option value="combined">Combined</option>
            </select>
          </F>
          <F label="Allergies (comma-separated)"><input className="input w-full" placeholder="e.g. Penicillin, Nuts" value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} /></F>
          <div className="sm:col-span-2">
            <F label="Medical conditions (comma-separated)"><input className="input w-full" value={form.medicalConditions} onChange={(e) => setForm({ ...form, medicalConditions: e.target.value })} /></F>
          </div>
          <F label="Mobility needs"><input className="input w-full" value={form.mobilityNeeds} onChange={(e) => setForm({ ...form, mobilityNeeds: e.target.value })} /></F>
          <F label="Communication needs"><input className="input w-full" value={form.communicationNeeds} onChange={(e) => setForm({ ...form, communicationNeeds: e.target.value })} /></F>
          <F label="Care hours allocated per day">
            <input
              className="input w-full" type="number" min="1" max="24"
              placeholder="e.g. 10 — carers document each hour"
              value={form.careHoursPerDay}
              onChange={(e) => setForm({ ...form, careHoursPerDay: e.target.value })}
            />
          </F>
          <F label="Care day starts at">
            <input
              className="input w-full" type="time"
              value={form.careDayStart}
              onChange={(e) => setForm({ ...form, careDayStart: e.target.value })}
            />
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
