import { useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UploadCloud, FileSpreadsheet, ArrowRight, ArrowLeft, CheckCircle,
  AlertTriangle, KeyRound, History,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge } from '@my-cura/ui-web';
import { apiClient } from '../../services/api.client';
import { formatDisplayDate } from '@my-cura/shared-utils';

type EntityType = 'service_users' | 'care_workers' | 'medications';

interface FieldDef { key: string; label: string; required?: boolean; aliases: string[] }
interface Catalogue {
  templates: { id: string; name: string }[];
  fields: Record<EntityType, FieldDef[]>;
}
interface ImportJob {
  id: string; entityType: string; fileName?: string; createdAt: string;
  rowCount: number; createdCount: number; updatedCount: number; errorCount: number;
}

const ENTITY_LABELS: Record<EntityType, string> = {
  service_users: 'Service Users',
  care_workers: 'Care Workers',
  medications: 'Medications',
};

/** Small but real CSV parser: quoted fields, embedded commas and newlines. */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else inQuotes = false;
      } else cell += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(cell); cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((v) => v.trim() !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((v) => v.trim() !== '')) rows.push(row);
  return rows;
}

const normHeader = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export function ImportPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'done'>('upload');
  const [entityType, setEntityType] = useState<EntityType>('service_users');
  const [template, setTemplate] = useState('generic');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, number>>({}); // fieldKey -> column index
  const [defaultPassword, setDefaultPassword] = useState('');
  const [previewResult, setPreviewResult] = useState<{ rowCount: number; validCount: number; errors: { row: number; message: string }[] } | null>(null);
  const [report, setReport] = useState<{ created: number; updated: number; errors: { row: number; message: string }[]; generatedPassword?: string } | null>(null);

  const { data: catalogue } = useQuery<Catalogue>({
    queryKey: ['import-catalogue'],
    queryFn: async () => (await apiClient.get('/imports/templates')).data,
  });

  const { data: jobs } = useQuery<ImportJob[]>({
    queryKey: ['import-jobs'],
    queryFn: async () => (await apiClient.get('/imports/jobs')).data,
  });

  const fields = useMemo(() => catalogue?.fields?.[entityType] ?? [], [catalogue, entityType]);

  const autoMap = (csvHeaders: string[], defs: FieldDef[]) => {
    const next: Record<string, number> = {};
    csvHeaders.forEach((header, index) => {
      const h = normHeader(header);
      for (const def of defs) {
        if (next[def.key] !== undefined) continue;
        if (h === normHeader(def.key) || def.aliases.includes(h)) {
          next[def.key] = index;
          break;
        }
      }
    });
    return next;
  };

  /** The catalogue must exist before we can auto-map — fetch it directly if
   *  the background query hasn't landed yet (fast machines beat the query). */
  const ensureFields = async (): Promise<FieldDef[]> => {
    if (catalogue?.fields) return catalogue.fields[entityType];
    const { data } = await apiClient.get<Catalogue>('/imports/templates');
    qc.setQueryData(['import-catalogue'], data);
    return data.fields[entityType];
  };

  const onFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseCSV(text);
    if (parsed.length < 2) {
      toast.error('That file needs a header row and at least one data row');
      return;
    }
    const defs = await ensureFields();
    setFileName(file.name);
    setHeaders(parsed[0].map((h) => h.trim()));
    setDataRows(parsed.slice(1));
    setMapping(autoMap(parsed[0].map((h) => h.trim()), defs));
    setStep('map');
  };

  const mappedRows = useMemo(
    () =>
      dataRows.map((r) => {
        const obj: Record<string, string> = {};
        for (const [key, col] of Object.entries(mapping)) {
          if (col >= 0 && r[col] !== undefined) obj[key] = r[col];
        }
        return obj;
      }),
    [dataRows, mapping],
  );

  const runPreview = useMutation({
    mutationFn: async () =>
      (await apiClient.post('/imports/preview', { entityType, rows: mappedRows })).data,
    onSuccess: (data) => {
      setPreviewResult(data);
      setStep('preview');
    },
    onError: () => toast.error('Validation failed to run'),
  });

  const runCommit = useMutation({
    mutationFn: async () =>
      (await apiClient.post('/imports/commit', {
        entityType,
        rows: mappedRows,
        fileName,
        template,
        defaultPassword: defaultPassword.trim() || undefined,
      })).data,
    onSuccess: (data) => {
      setReport(data);
      setStep('done');
      qc.invalidateQueries({ queryKey: ['import-jobs'] });
      qc.invalidateQueries({ queryKey: ['service-users'] });
      qc.invalidateQueries({ queryKey: ['care-workers'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'Import failed — nothing was saved'),
  });

  const reset = () => {
    setStep('upload');
    setHeaders([]);
    setDataRows([]);
    setMapping({});
    setPreviewResult(null);
    setReport(null);
    setFileName('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const missingRequired = fields.filter((f) => f.required && mapping[f.key] === undefined);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
          <UploadCloud className="w-5 h-5 text-primary-500" />
        </div>
        <div>
          <h1 className="page-header">Data Import</h1>
          <p className="text-sm text-slate-500">
            Move from your previous care system — re-importing the same file updates records, never duplicates them.
          </p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 text-xs font-semibold">
        {(['upload', 'map', 'preview', 'done'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <ArrowRight className="w-3.5 h-3.5 text-slate-300" />}
            <span
              className={`px-3 py-1.5 rounded-full ${
                step === s
                  ? 'bg-primary-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              {i + 1}. {s === 'upload' ? 'Upload' : s === 'map' ? 'Match columns' : s === 'preview' ? 'Check' : 'Import'}
            </span>
          </div>
        ))}
      </div>

      {/* ── Step 1: upload ── */}
      {step === 'upload' && (
        <div className="card p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">What are you importing?</label>
              <select className="input w-full" value={entityType} onChange={(e) => setEntityType(e.target.value as EntityType)}>
                <option value="service_users">Service users (clients)</option>
                <option value="care_workers">Care workers (staff)</option>
                <option value="medications">Medications</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Coming from</label>
              <select className="input w-full" value={template} onChange={(e) => setTemplate(e.target.value)}>
                {(catalogue?.templates ?? []).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          {entityType === 'medications' && (
            <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 max-w-2xl">
              Import service users first — each medication row must name its service user
              (by the old system's ID or "Firstname Lastname").
            </p>
          )}

          <label
            className="block max-w-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-10 text-center cursor-pointer hover:border-primary-400 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) onFile(f);
            }}
          >
            <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-400 mb-3" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Drop your CSV export here, or click to choose
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Using Excel? Save your sheet as CSV first (File → Save As → CSV).
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
            />
          </label>
        </div>
      )}

      {/* ── Step 2: column mapping ── */}
      {step === 'map' && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              <span className="font-semibold">{fileName}</span> — {dataRows.length} rows.
              Match your file's columns to My-Cura fields (we've guessed where we could).
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  {['My-Cura field', 'Column in your file', 'Example from row 1'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {fields.map((f) => (
                  <tr key={f.key}>
                    <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-300">
                      {f.label} {f.required && <span className="text-red-500">*</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <select
                        className="input w-64"
                        value={mapping[f.key] ?? -1}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setMapping((m) => {
                            const next = { ...m };
                            if (v < 0) delete next[f.key];
                            else next[f.key] = v;
                            return next;
                          });
                        }}
                      >
                        <option value={-1}>— not in my file —</option>
                        {headers.map((h, i) => (
                          <option key={i} value={i}>{h || `(column ${i + 1})`}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 max-w-[220px] truncate">
                      {mapping[f.key] !== undefined ? dataRows[0]?.[mapping[f.key]] ?? '' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {entityType === 'care_workers' && (
            <div className="max-w-md">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Password for new staff logins (optional — we generate one if blank)
              </label>
              <input className="input w-full" value={defaultPassword} onChange={(e) => setDefaultPassword(e.target.value)} placeholder="min 8 characters" />
            </div>
          )}

          {missingRequired.length > 0 && (
            <p className="text-sm text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Still needed: {missingRequired.map((f) => f.label).join(', ')}
            </p>
          )}

          <div className="flex justify-between">
            <button className="btn-secondary flex items-center gap-2" onClick={reset}>
              <ArrowLeft className="w-4 h-4" /> Start over
            </button>
            <button
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
              disabled={missingRequired.length > 0 || runPreview.isPending}
              onClick={() => runPreview.mutate()}
            >
              {runPreview.isPending ? 'Checking…' : 'Check my data'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: validation preview ── */}
      {step === 'preview' && previewResult && (
        <div className="card p-6 space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="stat-card flex-1 min-w-[140px]">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{previewResult.rowCount}</div>
              <div className="text-sm text-slate-500">rows in file</div>
            </div>
            <div className="stat-card flex-1 min-w-[140px]">
              <div className="text-2xl font-bold text-green-600">{previewResult.validCount}</div>
              <div className="text-sm text-slate-500">ready to import</div>
            </div>
            <div className="stat-card flex-1 min-w-[140px]">
              <div className={`text-2xl font-bold ${previewResult.errors.length ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>
                {new Set(previewResult.errors.map((e) => e.row)).size}
              </div>
              <div className="text-sm text-slate-500">rows with problems</div>
            </div>
          </div>

          {previewResult.errors.length > 0 && (
            <div className="max-h-64 overflow-y-auto rounded-xl border border-red-100 dark:border-red-900/40 divide-y divide-red-50 dark:divide-red-900/20">
              {previewResult.errors.slice(0, 100).map((e, i) => (
                <p key={i} className="px-4 py-2 text-sm text-red-700 dark:text-red-400">
                  Row {e.row}: {e.message}
                </p>
              ))}
            </div>
          )}
          <p className="text-sm text-slate-500">
            Rows with problems are skipped; everything else imports. Nothing has been saved yet.
          </p>

          <div className="flex justify-between">
            <button className="btn-secondary flex items-center gap-2" onClick={() => setStep('map')}>
              <ArrowLeft className="w-4 h-4" /> Fix column matching
            </button>
            <button
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
              disabled={previewResult.validCount === 0 || runCommit.isPending}
              onClick={() => runCommit.mutate()}
            >
              {runCommit.isPending ? 'Importing…' : `Import ${previewResult.validCount} rows`}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: report ── */}
      {step === 'done' && report && (
        <div className="card p-8 text-center space-y-4">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Import complete</h2>
          <p className="text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-green-600">{report.created} created</span> ·{' '}
            <span className="font-semibold text-primary-600">{report.updated} updated</span>
            {report.errors.length > 0 && (
              <> · <span className="font-semibold text-red-600">{report.errors.length} skipped</span></>
            )}
          </p>
          {report.generatedPassword && (
            <div className="inline-flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 rounded-xl px-4 py-3 text-sm">
              <KeyRound className="w-4 h-4" />
              New staff can log in with the password
              <code className="font-bold">{report.generatedPassword}</code>
              — shown only once, ask them to change it.
            </div>
          )}
          <div>
            <button className="btn-primary" onClick={reset}>Import another file</button>
          </div>
        </div>
      )}

      {/* Import history */}
      <div className="card p-6">
        <h2 className="section-header flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-primary-500" /> Previous imports
        </h2>
        {(jobs ?? []).length === 0 ? (
          <p className="text-sm text-slate-400">No imports yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                {['When', 'Type', 'File', 'Rows', 'Created', 'Updated', 'Errors'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {(jobs ?? []).map((j) => (
                <tr key={j.id}>
                  <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{formatDisplayDate(j.createdAt)}</td>
                  <td className="px-4 py-2.5">
                    <Badge color="purple" dot>{ENTITY_LABELS[j.entityType as EntityType] ?? j.entityType}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 max-w-[200px] truncate">{j.fileName ?? '—'}</td>
                  <td className="px-4 py-2.5 text-slate-600">{j.rowCount}</td>
                  <td className="px-4 py-2.5 text-green-600 font-medium">{j.createdCount}</td>
                  <td className="px-4 py-2.5 text-primary-600 font-medium">{j.updatedCount}</td>
                  <td className={`px-4 py-2.5 font-medium ${j.errorCount ? 'text-red-600' : 'text-slate-400'}`}>{j.errorCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
