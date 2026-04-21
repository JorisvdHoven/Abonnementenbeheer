import { useState } from 'react';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { useSettings } from '../hooks/useSettings';
import { useCurrentUser } from '../hooks/useCurrentUser';
import SubscriptionModal from '../components/SubscriptionModal';
import { SubscriptionDetailPanel } from '../components/SubscriptionDetailPanel';
import { SubLogo } from '../components/SubLogo';
import { addDays, isBefore } from 'date-fns';
import { toMonthly } from '../lib/costUtils';

const EXPORT_FIELDS = [
  { key: 'name',         label: 'Naam',              getValue: s => s.name ?? '' },
  { key: 'vendor',       label: 'Leverancier',        getValue: s => s.vendor ?? '' },
  { key: 'category',     label: 'Categorie',          getValue: s => s.category ?? '' },
  { key: 'type',         label: 'Type',               getValue: s => s.type ?? '' },
  { key: 'department',   label: 'Afdeling',           getValue: s => s.department ?? '' },
  { key: 'status',       label: 'Status',             getValue: s => s.status ?? '' },
  { key: 'cost',         label: 'Kosten',             getValue: s => s.cost != null ? s.cost.toString().replace('.', ',') : '' },
  { key: 'currency',     label: 'Valuta',             getValue: s => s.currency ?? 'EUR' },
  { key: 'cost_period',  label: 'Facturatieperiode',  getValue: s => s.cost_period ?? '' },
  { key: 'seats',        label: 'Seats',              getValue: s => s.seats ?? '' },
  { key: 'cost_per_seat',label: 'Prijs per seat',     getValue: s => s.cost_per_seat ? 'Ja' : 'Nee' },
  { key: 'start_date',   label: 'Startdatum',         getValue: s => s.start_date ? new Date(s.start_date).toLocaleDateString('nl-NL') : '' },
  { key: 'end_date',     label: 'Einddatum',          getValue: s => s.end_date ? new Date(s.end_date).toLocaleDateString('nl-NL') : '' },
  { key: 'renewal_date', label: 'Verlengingsdatum',   getValue: s => s.renewal_date ? new Date(s.renewal_date).toLocaleDateString('nl-NL') : '' },
  { key: 'auto_renew',   label: 'Auto-verlenging',    getValue: s => s.auto_renew ? 'Ja' : 'Nee' },
  { key: 'contact_name', label: 'Contactpersoon',     getValue: s => s.contact_name ?? '' },
  { key: 'contact_email',label: 'Contact e-mail',     getValue: s => s.contact_email ?? '' },
  { key: 'contact_phone',label: 'Contact telefoon',   getValue: s => s.contact_phone ?? '' },
  { key: 'notes',        label: 'Notities',           getValue: s => s.notes ?? '' },
];

const DEFAULT_SELECTED = new Set(['name','vendor','category','type','department','status','cost','currency','cost_period','renewal_date']);

function ExportModal({ count, onExport, onClose }) {
  const [selected, setSelected] = useState(new Set(DEFAULT_SELECTED));

  const toggle = (key) => setSelected(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  const allSelected = selected.size === EXPORT_FIELDS.length;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(EXPORT_FIELDS.map(f => f.key)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60">
      <div className="surface-card-strong w-full max-w-md mx-4 p-6 space-y-5">
        <div>
          <h2 className="text-lg font-bold text-dark">CSV exporteren</h2>
          <p className="text-sm text-slate-500 mt-0.5">Kies welke velden je wilt meenemen. {count} abonnement{count !== 1 ? 'en' : ''} wordt geëxporteerd.</p>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Velden</span>
          <button onClick={toggleAll} className="text-xs text-primary hover:underline">
            {allSelected ? 'Deselecteer alles' : 'Selecteer alles'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {EXPORT_FIELDS.map(field => (
            <label key={field.key} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={selected.has(field.key)}
                onChange={() => toggle(field.key)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-slate-600 group-hover:text-dark transition-colors">{field.label}</span>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <button onClick={onClose} className="btn-secondary">Annuleren</button>
          <button
            onClick={() => onExport(selected)}
            disabled={selected.size === 0}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ↓ Exporteren ({selected.size} velden)
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    actief:   'bg-green-50 text-green-700 ring-1 ring-green-200',
    verlopen: 'bg-red-50 text-red-600 ring-1 ring-red-200',
    opgezegd: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
  };
  const labels = { actief: 'Actief', verlopen: 'Verlopen', opgezegd: 'Opgezegd' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? styles.opgezegd}`}>
      {labels[status] ?? status}
    </span>
  );
}

function CostDisplay({ sub }) {
  if (!sub.cost) return <span className="text-slate-400">—</span>;
  const sym = sub.currency === 'USD' ? '$' : '€';
  if (sub.cost_period === 'Eenmalig') {
    return <span>{sym}{sub.cost} <span className="text-xs text-slate-400">eenmalig</span></span>;
  }
  const monthly = toMonthly(sub.cost, sub.cost_period);
  if (sub.cost_period === 'Maandelijks') return <span>{sym}{sub.cost}<span className="text-xs text-slate-400 ml-0.5">/mnd</span></span>;
  return (
    <span title={`${sym}${sub.cost} ${sub.cost_period}`}>
      €{monthly.toFixed(2)}<span className="text-xs text-slate-400 ml-0.5">/mnd</span>
    </span>
  );
}

function DaysLeft({ date, urgent }) {
  if (!date) return null;
  const days = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
  if (days < 0) return <span className="text-xs text-red-400">Verlopen</span>;
  return (
    <span className={`text-xs font-medium ${urgent ? 'text-orange-500' : 'text-slate-400'}`}>
      nog {days}d
    </span>
  );
}

function SubRow({ sub, onView, showUrgency }) {
  const renewalDate = sub.renewal_date || sub.end_date;
  const isUrgent = showUrgency && renewalDate;
  return (
    <tr
      onClick={() => onView(sub)}
      className="group cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors duration-100"
    >
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <SubLogo vendor={sub.vendor} name={sub.name} />
          <div>
            <p className="font-semibold text-dark text-sm">{sub.name}</p>
            {sub.vendor && <p className="text-xs text-slate-400 mt-0.5">{sub.vendor}</p>}
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5 hidden md:table-cell">
        <div className="flex flex-col gap-1">
          {sub.category
            ? <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium w-fit">{sub.category}</span>
            : <span className="text-slate-300 text-xs">—</span>}
          {sub.department && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-orange-50 text-orange-600 text-xs font-medium w-fit">{sub.department}</span>
          )}
        </div>
      </td>
      <td className="px-5 py-3.5 text-sm font-medium text-dark">
        <CostDisplay sub={sub} />
      </td>
      <td className="px-5 py-3.5 hidden lg:table-cell">
        {renewalDate ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">{new Date(renewalDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            {isUrgent && <DaysLeft date={renewalDate} urgent={true} />}
          </div>
        ) : (
          <span className="text-slate-300 text-xs">—</span>
        )}
      </td>
      <td className="px-5 py-3.5 hidden sm:table-cell">
        <StatusBadge status={sub.status} />
      </td>
      <td className="px-5 py-3.5 text-right">
        <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium">
          Bekijken →
        </span>
      </td>
    </tr>
  );
}

const COLUMNS = [
  { key: 'name',         label: 'Naam',            className: '' },
  { key: 'category',     label: 'Categorie',       className: 'hidden md:table-cell' },
  { key: 'cost',         label: 'Kosten',          className: '' },
  { key: 'renewal_date', label: 'Verlengingsdatum',className: 'hidden lg:table-cell' },
  { key: 'status',       label: 'Status',          className: 'hidden sm:table-cell' },
];

function Section({ title, rows, onView, showUrgency, accent }) {
  const [open, setOpen] = useState(true);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const getSortVal = (sub, key) => {
    if (key === 'cost') return toMonthly(sub.cost || 0, sub.cost_period);
    if (key === 'renewal_date') return sub.renewal_date || sub.end_date || null;
    return sub[key] ?? null;
  };

  const sorted = sortKey ? [...rows].sort((a, b) => {
    const aVal = getSortVal(a, sortKey);
    const bVal = getSortVal(b, sortKey);
    if (aVal === null && bVal === null) return 0;
    if (aVal === null) return 1;
    if (bVal === null) return -1;
    if (typeof aVal === 'number') return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    return sortDir === 'asc'
      ? String(aVal).localeCompare(String(bVal), 'nl')
      : String(bVal).localeCompare(String(aVal), 'nl');
  }) : rows;

  return (
    <div className={`surface-card-strong overflow-hidden ${accent === 'orange' ? 'border-l-4 border-orange-400' : ''}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-dark">{title}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            accent === 'orange' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'
          }`}>{rows.length}</span>
        </div>
        <span className="text-slate-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="border-t border-slate-100">
          {rows.length === 0 ? (
            <p className="px-5 py-4 text-sm text-slate-400">Geen abonnementen.</p>
          ) : (
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col style={{ width: '30%' }} />
                <col className="hidden md:table-column" style={{ width: '18%' }} />
                <col style={{ width: '16%' }} />
                <col className="hidden lg:table-column" style={{ width: '22%' }} />
                <col className="hidden sm:table-column" style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {COLUMNS.map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className={`px-5 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide cursor-pointer select-none hover:text-slate-600 transition-colors ${col.className}`}
                    >
                      {col.label}
                      {sortKey === col.key
                        ? <span className="ml-1 text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>
                        : <span className="ml-1 opacity-30">↕</span>}
                    </th>
                  ))}
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {sorted.map(sub => (
                  <SubRow key={sub.id} sub={sub} onView={onView} showUrgency={showUrgency} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function SubscriptionsPage() {
  const { subscriptions, loading, addSubscription, updateSubscription, deleteSubscription } = useSubscriptions();
  const { categories: settingCategories, types, departments: settingDepartments, addCategory, addType, addDepartment } = useSettings();
  const { isAdmin } = useCurrentUser();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState(null);
  const [detailSub, setDetailSub] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const categories = settingCategories.length > 0
    ? settingCategories.map(c => c.name)
    : [...new Set(subscriptions.map(s => s.category).filter(Boolean))];
  const typesList = types.length > 0
    ? types.map(t => t.name)
    : [...new Set(subscriptions.map(s => s.type).filter(Boolean))];
  const departmentsList = settingDepartments.length > 0
    ? settingDepartments.map(d => d.name)
    : [...new Set(subscriptions.map(s => s.department).filter(Boolean))];

  const applyFilters = (list) => list.filter(sub => {
    const q = search.toLowerCase();
    const matchSearch = sub.name.toLowerCase().includes(q) ||
      (sub.vendor?.toLowerCase().includes(q)) ||
      (sub.contact_name?.toLowerCase().includes(q));
    return matchSearch
      && (!categoryFilter || sub.category === categoryFilter)
      && (!typeFilter || sub.type === typeFilter)
      && (!departmentFilter || sub.department === departmentFilter);
  });

  const now = new Date();
  const soon = addDays(now, 60);
  const filtered = applyFilters(subscriptions);

  const expiringSoon = filtered.filter(s => {
    if (s.status !== 'actief' || s.auto_renew) return false;
    const renewalSoon = s.renewal_date && isBefore(new Date(s.renewal_date), soon);
    const endSoon = s.end_date && isBefore(new Date(s.end_date), soon);
    return renewalSoon || endSoon;
  });
  const expiringSoonIds = new Set(expiringSoon.map(s => s.id));
  const actief   = filtered.filter(s => s.status === 'actief' && !expiringSoonIds.has(s.id));
  const verlopen = filtered.filter(s => s.status === 'verlopen');
  const opgezegd = filtered.filter(s => s.status === 'opgezegd');

  const handleView   = (sub) => setDetailSub(sub);
  const handleEdit   = (sub) => { setDetailSub(null); setEditingSub(sub); setModalOpen(true); };
  const handleAdd    = () => { setEditingSub(null); setModalOpen(true); };
  const handleDelete = async (id) => {
    if (confirm('Weet je zeker dat je dit abonnement wilt verwijderen?')) {
      await deleteSubscription(id);
      setDetailSub(null);
    }
  };
  const handleSave = async (subData) => {
    setSaveError(null);
    const result = editingSub
      ? await updateSubscription(editingSub.id, subData)
      : await addSubscription(subData);
    if (result?.error) {
      setSaveError(`Opslaan mislukt: ${result.error.message}`);
      return;
    }
    setModalOpen(false);
  };

  const handleExportCSV = (selectedFields) => {
    const fields = EXPORT_FIELDS.filter(f => selectedFields.has(f.key));
    const headers = fields.map(f => f.label);
    const rows = filtered.map(sub =>
      fields.map(f => `"${String(f.getValue(sub)).replace(/"/g, '""')}"`)
    );
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `abonnementen-${new Date().toLocaleDateString('nl-NL').replace(/\//g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setExportModalOpen(false);
  };

  if (loading) return <div className="p-6">Loading...</div>;

  const totalMonthly = subscriptions
    .filter(s => s.status === 'actief')
    .reduce((sum, s) => sum + (toMonthly(s.cost, s.cost_period) || 0), 0);

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="surface-card-strong p-5 flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark">Abonnementen</h1>
          <p className="text-sm text-slate-500 mt-1">
            {subscriptions.filter(s => s.status === 'actief').length} actief · €{totalMonthly.toFixed(0)}/mnd
          </p>
        </div>
        <div className="flex gap-2 items-start">
          <button onClick={() => setExportModalOpen(true)} className="btn-secondary text-sm">↓ CSV</button>
          {isAdmin && <button onClick={handleAdd} className="btn-primary text-sm">+ Nieuw abonnement</button>}
        </div>
      </div>

      {/* Filters */}
      <div className="surface-card p-3 flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          placeholder="Zoek op naam of leverancier…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="field-strong flex-1 px-3 py-2 rounded-md border text-sm focus:outline-none"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="field-strong px-3 py-2 rounded-md border text-sm focus:outline-none"
        >
          <option value="">Alle categorieën</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="field-strong px-3 py-2 rounded-md border text-sm focus:outline-none"
        >
          <option value="">Alle types</option>
          {typesList.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="field-strong px-3 py-2 rounded-md border text-sm focus:outline-none"
        >
          <option value="">Alle afdelingen</option>
          {departmentsList.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Sections */}
      {expiringSoon.length > 0 && (
        <Section title="Verloopt binnenkort" rows={expiringSoon} onView={handleView} showUrgency accent="orange" />
      )}
      <Section title="Actief" rows={actief} onView={handleView} />
      <Section title="Verlopen" rows={verlopen} onView={handleView} />
      <Section title="Opgezegd" rows={opgezegd} onView={handleView} />

      {exportModalOpen && (
        <ExportModal
          count={filtered.length}
          onExport={handleExportCSV}
          onClose={() => setExportModalOpen(false)}
        />
      )}

      {detailSub && (
        <SubscriptionDetailPanel
          sub={detailSub}
          onClose={() => setDetailSub(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {modalOpen && (
        <SubscriptionModal
          subscription={editingSub}
          categoryOptions={categories}
          typeOptions={typesList}
          departmentOptions={departmentsList}
          onAddCategory={addCategory}
          onAddType={addType}
          onAddDepartment={addDepartment}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setSaveError(null); }}
          saveError={saveError}
        />
      )}
    </div>
  );
}

export default SubscriptionsPage;
