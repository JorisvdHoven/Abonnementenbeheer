import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuditLog } from '../hooks/useAuditLog';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { formatDateLong } from '../lib/format';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

const ENTITY_LABELS = {
  subscription: 'Abonnement',
  account: 'Account',
  profile: 'Gebruiker',
  category: 'Categorie',
  type: 'Type',
  department: 'Afdeling',
};

const ACTION_LABELS = {
  insert: 'Toegevoegd',
  update: 'Gewijzigd',
  delete: 'Verwijderd',
};

const ACTION_DOT = {
  insert: 'bg-green-500',
  update: 'bg-blue-500',
  delete: 'bg-red-500',
};

const ACTION_TEXT = {
  insert: 'text-green-700',
  update: 'text-blue-700',
  delete: 'text-red-600',
};

const FIELD_LABELS = {
  name: 'Naam',
  full_name: 'Volledige naam',
  email: 'E-mail',
  vendor: 'Leverancier',
  cost: 'Kosten',
  cost_period: 'Periode',
  cost_per_seat: 'Prijs per seat',
  currency: 'Valuta',
  category: 'Categorie',
  type: 'Type',
  department: 'Afdeling',
  status: 'Status',
  start_date: 'Startdatum',
  end_date: 'Einddatum',
  renewal_date: 'Verlengingsdatum',
  auto_renew: 'Auto-verlenging',
  account_owner: 'Account van',
  contact_name: 'Contactpersoon',
  contact_email: 'E-mail contact',
  contact_phone: 'Telefoon',
  seats: 'Gebruikers',
  notes: 'Notities',
  terms: 'Voorwaarden',
  role: 'Rol',
  owner_name: 'Naam medewerker',
};

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'zojuist';
  if (minutes < 60) return `${minutes} min geleden`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} uur geleden`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} dag${days === 1 ? '' : 'en'} geleden`;
  return formatDateLong(iso);
}

function fmtVal(v) {
  if (v === null || v === undefined || v === '') return '∅';
  if (typeof v === 'boolean') return v ? 'Ja' : 'Nee';
  const s = String(v);
  return s.length > 80 ? s.slice(0, 77) + '…' : s;
}

function ChangeDetails({ changes, action }) {
  if (!changes) return null;

  // Voor INSERT/DELETE: snapshot van het object — toon de relevante velden
  if (action !== 'update') {
    const fields = ['name', 'full_name', 'owner_name', 'email', 'cost', 'cost_period', 'currency', 'department', 'role'];
    const visible = fields.filter(f => changes[f] !== undefined && changes[f] !== null && changes[f] !== '');
    if (visible.length === 0) return null;
    return (
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
        {visible.map(f => (
          <div key={f} className="flex items-baseline gap-2 text-xs">
            <span className="text-slate-400 min-w-[90px]">{FIELD_LABELS[f] ?? f}</span>
            <span className="text-slate-700 font-medium tabular-nums truncate">{fmtVal(changes[f])}</span>
          </div>
        ))}
      </div>
    );
  }

  // Voor UPDATE: toon old → new per veld
  const entries = Object.entries(changes);
  if (entries.length === 0) return null;
  return (
    <div className="mt-3 space-y-1.5">
      {entries.map(([field, val]) => (
        <div key={field} className="flex items-baseline gap-2 text-xs">
          <span className="text-slate-400 min-w-[120px]">{FIELD_LABELS[field] ?? field}</span>
          <span className="inline-flex items-center gap-1.5 flex-1 min-w-0">
            <span className="text-slate-500 line-through tabular-nums truncate">{fmtVal(val.old)}</span>
            <span className="text-slate-300 flex-shrink-0">→</span>
            <span className="text-slate-900 font-medium tabular-nums truncate">{fmtVal(val.new)}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function ActiviteitPage() {
  const { isAdmin, loading: userLoading } = useCurrentUser();
  const { entries, loading } = useAuditLog(200);
  const [expanded, setExpanded] = useState(new Set());
  const [filter, setFilter] = useState('');
  const navigate = useNavigate();

  if (userLoading) return <div className="p-6">Loading...</div>;
  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-2xl border border-slate-200/70 p-12 text-center">
          <p className="text-slate-500">Deze pagina is alleen toegankelijk voor admins.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-primary shadow-sm hover:brightness-110 transition-all mt-5"
          >
            Terug naar dashboard
          </button>
        </div>
      </div>
    );
  }

  const toggleExpand = (id) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const filtered = filter
    ? entries.filter(e => e.entity_type === filter)
    : entries;

  return (
    <div className="p-6 space-y-4">

      {/* Header — plain */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Activiteit</h1>
        <p className="text-sm text-slate-500 mt-1 tabular-nums">
          Wie heeft wat veranderd? Laatste {entries.length} wijzigingen.
        </p>
      </div>

      {/* Filter pills */}
      <div className="bg-white rounded-2xl border border-slate-200/70 p-2 flex flex-wrap gap-1">
        <button
          onClick={() => setFilter('')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            filter === ''
              ? 'bg-primary/15 text-primary'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Alles <span className="ml-1 text-xs opacity-70 tabular-nums">{entries.length}</span>
        </button>
        {Object.entries(ENTITY_LABELS).map(([key, label]) => {
          const count = entries.filter(e => e.entity_type === key).length;
          if (count === 0) return null;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === key
                  ? 'bg-primary/15 text-primary'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {label} <span className="ml-1 text-xs opacity-70 tabular-nums">{count}</span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/70 p-12 text-center text-slate-400">
          Laden…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/70 p-12 text-center text-slate-400">
          Nog geen activiteit gelogd.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
          {filtered.map((e) => {
            const isOpen = expanded.has(e.id);
            return (
              <div key={e.id} className="border-b border-slate-100 last:border-0">
                <button
                  onClick={() => toggleExpand(e.id)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors text-left group"
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ACTION_DOT[e.action]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className={`text-sm font-semibold ${ACTION_TEXT[e.action]}`}>
                        {ACTION_LABELS[e.action]}
                      </span>
                      <span className="text-sm text-slate-400">{ENTITY_LABELS[e.entity_type] ?? e.entity_type}</span>
                      <span className="font-medium text-slate-900 text-sm truncate">{e.entity_label || '—'}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                      door <span className="font-medium text-slate-600">{e.user_email || 'systeem'}</span>
                      <span className="mx-1.5 text-slate-300">·</span>
                      <span title={formatDateLong(e.created_at)}>{relativeTime(e.created_at)}</span>
                    </p>
                  </div>
                  <ChevronDownIcon className={`h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-all flex-shrink-0 ${isOpen ? '' : '-rotate-90'}`} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 -mt-1 ml-4">
                    <ChangeDetails changes={e.changes} action={e.action} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ActiviteitPage;
