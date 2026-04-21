import { useEffect } from 'react';
import { XMarkIcon, PencilSquareIcon, TrashIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { SubLogo } from './SubLogo';
import { toMonthly } from '../lib/costUtils';
import { useCurrentUser } from '../hooks/useCurrentUser';

function DetailRow({ label, value }) {
  const empty = value === null || value === undefined || value === '';
  return (
    <div className="flex justify-between items-start py-2 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`text-sm text-right ${empty ? 'text-slate-300 italic' : 'text-dark font-medium'}`}>
        {empty ? 'Niet ingevuld' : value}
      </span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-slate-50 rounded-xl p-4 space-y-0">
      <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">{title}</p>
      {children}
    </div>
  );
}

export function SubscriptionDetailPanel({ sub, onClose, onEdit, onDelete }) {
  const { isAdmin } = useCurrentUser();

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!sub) return null;

  const monthly = sub.cost_period && sub.cost_period !== 'Eenmalig'
    ? toMonthly(sub.cost, sub.cost_period)
    : null;

  const statusColors = {
    actief:   'bg-green-100 text-green-700',
    verlopen: 'bg-red-100 text-red-600',
    opgezegd: 'bg-slate-100 text-slate-500',
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col h-full">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <SubLogo vendor={sub.vendor} name={sub.name} size="lg" />
            <div>
              <h2 className="text-xl font-bold text-dark">{sub.name}</h2>
              {sub.vendor && <p className="text-sm text-slate-400 mt-0.5">{sub.vendor}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Status */}
        <div className="px-6 py-3 border-b border-slate-100">
          <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[sub.status] ?? 'bg-slate-100 text-slate-500'}`}>
            {sub.status ?? '-'}
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          <Section title="Abonnement">
            <DetailRow label="Categorie" value={sub.category} />
            <DetailRow label="Type" value={sub.type} />
            <DetailRow label="Afdeling" value={sub.department} />
            <DetailRow label="Seats" value={sub.seats} />
          </Section>

          <Section title="Kosten">
            <DetailRow label="Kosten" value={`${sub.currency === 'USD' ? '$' : '€'}${sub.cost}${sub.cost_period ? ` (${sub.cost_period})` : ''}${sub.cost_per_seat ? ` × ${sub.seats || 1} seats` : ''}`} />
            {monthly !== null && sub.cost_period !== 'Maandelijks' && (
              <DetailRow label="Per maand" value={`€${(monthly * (sub.cost_per_seat ? (sub.seats || 1) : 1)).toFixed(2)}`} />
            )}
            {monthly !== null && (
              <DetailRow label="Per jaar" value={`€${(monthly * (sub.cost_per_seat ? (sub.seats || 1) : 1) * 12).toFixed(2)}`} />
            )}
          </Section>

          <Section title="Datums">
            <DetailRow label="Startdatum" value={sub.start_date ? new Date(sub.start_date).toLocaleDateString('nl-NL') : null} />
            <DetailRow label="Einddatum" value={sub.end_date ? new Date(sub.end_date).toLocaleDateString('nl-NL') : null} />
            <DetailRow label="Verlengingsdatum" value={sub.renewal_date ? new Date(sub.renewal_date).toLocaleDateString('nl-NL') : null} />
            <DetailRow label="Auto-verlenging" value={sub.auto_renew === true ? 'Ja' : sub.auto_renew === false ? 'Nee' : null} />
          </Section>

          <Section title="Contact">
            <DetailRow label="Naam" value={sub.contact_name} />
            <DetailRow label="Telefoon" value={sub.contact_phone} />
            <DetailRow label="E-mail" value={sub.contact_email} />
          </Section>

          <Section title="Notities">
            {sub.notes
              ? <p className="text-sm text-slate-600 italic">{sub.notes}</p>
              : <p className="text-sm text-slate-300 italic">Niet ingevuld</p>
            }
          </Section>

          <Section title="Document">
            {sub.document_content
              ? <a href={sub.document_content} download={sub.document_name || `${sub.name}-document`} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                  <DocumentArrowDownIcon className="h-4 w-4" />
                  {sub.document_name || 'Download'}
                </a>
              : <p className="text-sm text-slate-300 italic">Niet ingevuld</p>
            }
          </Section>
        </div>

        {/* Footer */}
        {isAdmin && (
          <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
            <button onClick={() => onEdit(sub)} className="flex-1 btn-primary flex items-center justify-center gap-2">
              <PencilSquareIcon className="h-4 w-4" />
              Bewerken
            </button>
            <button onClick={() => onDelete(sub.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
              <TrashIcon className="h-4 w-4" />
              Verwijder
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
