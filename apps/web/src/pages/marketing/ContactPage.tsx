import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2, Mail, Send, LifeBuoy } from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { usePageMeta } from '../../hooks/usePageMeta';

// Placeholder inboxes — swap when the real addresses exist.
const SALES_EMAIL = 'sales@mycura.app';
const GENERAL_EMAIL = 'hello@mycura.app';

const ENQUIRY_TYPES = [
  { value: 'demo', label: 'Book a demo' },
  { value: 'sales', label: 'Sales enquiry' },
  { value: 'general', label: 'General enquiry' },
  { value: 'support', label: 'Support' },
];

export function ContactPage() {
  const [params] = useSearchParams();
  const initialType = ENQUIRY_TYPES.some((t) => t.value === params.get('type'))
    ? (params.get('type') as string)
    : 'demo';

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    organisation: '',
    enquiryType: initialType,
    message: '',
  });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  usePageMeta({
    title: 'Get in Touch — My-Cura',
    description:
      'Book a demo of My-Cura or ask us anything about care management software for UK domiciliary care agencies.',
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || form.message.trim().length < 10) {
      return;
    }
    setBusy(true);
    try {
      await apiClient.post('/enquiries', {
        ...form,
        phone: form.phone || undefined,
        organisation: form.organisation || undefined,
      });
      setSent(true);
    } catch {
      // Rate-limited or offline — the direct addresses are right beside the form.
      setSent(false);
      setBusy(false);
      alert('Sorry — we could not send that just now. Please email us directly instead.');
      return;
    }
    setBusy(false);
  };

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-24">
      <div className="max-w-2xl mb-12">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Get in touch</h1>
        <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">
          Discover how My-Cura can transform your agency's day-to-day. Fill out the form to
          book a demo — or if there's anything else we can help with, use the addresses
          alongside to contact us directly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        {/* Form */}
        <div className="lg:col-span-3">
          {sent ? (
            <div className="card p-10 text-center space-y-3">
              <CheckCircle className="w-12 h-12 mx-auto text-accent-500" />
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Thank you — we've got it
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                We'll come back to you within one working day.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="card p-6 sm:p-8 space-y-4" data-testid="contact-form">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Full name *</label>
                  <input
                    className="input"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Jane Adeyemi"
                  />
                </div>
                <div>
                  <label className="form-label">Work email *</label>
                  <input
                    type="email"
                    className="input"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="jane@youragency.co.uk"
                  />
                </div>
                <div>
                  <label className="form-label">Phone</label>
                  <input
                    className="input"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="07123 456789"
                  />
                </div>
                <div>
                  <label className="form-label">Agency / organisation</label>
                  <input
                    className="input"
                    value={form.organisation}
                    onChange={(e) => setForm({ ...form, organisation: e.target.value })}
                    placeholder="Willow Court Care Ltd"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">What can we help with? *</label>
                <select
                  className="input"
                  value={form.enquiryType}
                  onChange={(e) => setForm({ ...form, enquiryType: e.target.value })}
                >
                  {ENQUIRY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Message *</label>
                <textarea
                  className="input"
                  rows={5}
                  required
                  minLength={10}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Tell us a little about your agency — how many carers, what you use today, and what you'd like to see."
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {busy ? 'Sending…' : 'Send message'}
              </button>
            </form>
          )}
        </div>

        {/* Direct contact block */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-6">
            <h2 className="section-header mb-4">Contact us</h2>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-primary-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Sales enquiries</p>
                  <a href={`mailto:${SALES_EMAIL}`} className="text-sm text-primary-600 dark:text-primary-300 hover:underline">
                    {SALES_EMAIL}
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-primary-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">General enquiries</p>
                  <a href={`mailto:${GENERAL_EMAIL}`} className="text-sm text-primary-600 dark:text-primary-300 hover:underline">
                    {GENERAL_EMAIL}
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <LifeBuoy className="w-5 h-5 text-primary-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Already a customer?</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Message your manager in the app, or choose “Support” in the form.
                  </p>
                </div>
              </li>
            </ul>
          </div>

          <div className="card p-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Prefer to explore on your own? Every agency gets a private My-Cura free —
              no card, no sales call required.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
