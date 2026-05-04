import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuditLog } from '../hooks/useAuditLog';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { formatDateLong } from '../lib/format';

const ENTITY_LABELS = {
  subscription: 'Abonnement',
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

const ACTION_STYLES = {
  insert: 'bg-green-100 text-green-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
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

function ChangeDetails({ changes, action }) {
  if (!changes) return null;
  // Voor INSERT/DELETE is changes een snapshot — toon alleen relevante velden
  if (action !== 'update') {
    const fields = ['name', 'full_name', 'email', 'cost', 'cost_period', 'currency', 'department', 'role'];
    const visible = fields.filter(f => changes[f] !== undefined && changes[f] !== null && changes[f] !== '');
    if (visible.length === 0) return null;
    return (
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {visible.map(f => (
          <div key={f} className="text-slate-500">
            <span className="font-medium text-slate-600">{f}:</span> {String(changes[f])}
          </div>
        ))}
      </div>
    );
  }
  // Voor UPDATE: toon old → new per veld
  const entries = Object.entries(changes);
  if (entries.length === 0) return null;
  return (
    <div className="mt-2 space-y-1 text-xs">
      {entries.map(([field, val]) => (
        <div key={field} className="text-slate-500">
          <span className="font-medium text-slate-600">{field}:</span>{' '}
          <span className="text-red-500 line-through">{val.old === null ? '∅' : String(val.old).slice(0, 80)}</span>
          {' → '}
          <span className="text-green-600">{val.new === null ? '∅' : String(val.new).slice(0, 80)}</span>
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
        <div className="surface-card-strong p-8 text-center">
          <p className="text-slate-500">Deze pagina is alleen toegankelijk voor admins.</p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary mt-4">Terug naar dashboard</button>
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
      <div className="surface-card-strong p-5">
        <h1 className="text-2xl font-bold text-dark">Activiteit</h1>
        <p className="text-sm text-slate-500 mt-1">Wie heeft wat veranderd? Laatste 200 wijzigingen.</p>
      </div>

      <div className="surface-card p-3 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            filter === '' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Alles ({entries.length})
        </button>
        {Object.entries(ENTITY_LABELS).map(([key, label]) => {
          const count = entries.filter(e => e.entity_type === key).length;
          if (count === 0) return null;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === key ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="surface-card-strong p-8 text-center text-slate-500">Laden...</div>
      ) : filtered.length === 0 ? (
        <div className="surface-card-strong p-12 text-center text-slate-400">
          Nog geen activiteit gelogd.
        </div>
      ) : (
        <div className="surface-card-strong overflow-hidden">
          {filtered.map((e) => {
            const isOpen = expanded.has(e.id);
            return (
              <div key={e.id} className="border-b border-slate-100 last:border-0">
                <button
                  onClick={() => toggleExpand(e.id)}
                  className="w-full flex items-start justify-between gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-md ${ACTION_STYLES[e.action]}`}>
                        {ACTION_LABELS[e.action]}
                      </span>
                      <span className="text-xs text-slate-400">{ENTITY_LABELS[e.entity_type] ?? e.entity_type}</span>
                      <span className="font-medium text-dark text-sm truncate">{e.entity_label || '—'}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      door <span className="font-medium">{e.user_email || 'systeem'}</span> · {relativeTime(e.created_at)}
                    </p>
                  </div>
                  <span className="text-slate-400 text-xs flex-shrink-0">{isOpen ? '▲' : '▼'}</span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-3 -mt-1">
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
