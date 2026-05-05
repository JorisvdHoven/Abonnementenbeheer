import { useState } from 'react';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { useSettings } from '../hooks/useSettings';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useDebounce } from '../hooks/useDebounce';
import SubscriptionModal from '../components/SubscriptionModal';
import { SubscriptionDetailPanel } from '../components/SubscriptionDetailPanel';
import { SubLogo } from '../components/SubLogo';
import Modal from '../components/Modal';
import BulkEditModal from '../components/BulkEditModal';
import MultiSelect from '../components/MultiSelect';
import { toast } from '../lib/toast';
import { addDays, isBefore } from 'date-fns';
import { toMonthly, toEurMonthly, countActiveAccountsNow, getBillingModel, BILLING_MODELS, BILLING_MODEL_LABELS } from '../lib/costUtils';
import { formatDate, formatDateLong, currencySymbol } from '../lib/format';
import {
  ChevronDownIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  ChevronUpDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowUturnLeftIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

const EXPORT_FIELDS = [
  { key: 'name',         label: 'Naam',              getValue: s => s.name ?? '' },
  { key: 'vendor',       label: 'Leverancier',        getValue: s => s.vendor ?? '' },
  { key: 'category',     label: 'Categorie',          getValue: s => s.category ?? '' },
  { key: 'department',   label: 'Afdeling',           getValue: s => s.department ?? '' },
  { key: 'billing_model',label: 'Kostenmodel',        getValue: s => BILLING_MODEL_LABELS[getBillingModel(s)] ?? '' },
  { key: 'status',       label: 'Status',             getValue: s => s.status ?? '' },
  { key: 'cost',         label: 'Kosten',             getValue: s => s.cost != null ? s.cost.toString().replace('.', ',') : '' },
  { key: 'currency',     label: 'Valuta',             getValue: s => s.currency ?? 'EUR' },
  { key: 'cost_period',  label: 'Facturatieperiode',  getValue: s => s.cost_period ?? '' },
  { key: 'seats',        label: 'Gebruikers',         getValue: s => s.seats ?? '' },
  { key: 'cost_per_seat',label: 'Prijs per gebruiker',getValue: s => s.cost_per_seat ? 'Ja' : 'Nee' },
  { key: 'start_date',   label: 'Startdatum',         getValue: s => formatDate(s.start_date) },
  { key: 'renewal_date', label: 'Vervaldatum',        getValue: s => formatDate(s.renewal_date) },
  { key: 'auto_renew',   label: 'Auto-verlenging',    getValue: s => s.auto_renew ? 'Ja' : 'Nee' },
  { key: 'contact_name', label: 'Contactpersoon',     getValue: s => s.contact_name ?? '' },
  { key: 'contact_email',label: 'Contact e-mail',     getValue: s => s.contact_email ?? '' },
  { key: 'contact_phone',label: 'Contact telefoon',   getValue: s => s.contact_phone ?? '' },
  { key: 'notes',        label: 'Notities',           getValue: s => s.notes ?? '' },
];

const DEFAULT_SELECTED = new Set(['name','vendor','category','department','billing_model','status','cost','currency','cost_period','renewal_date']);

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
    <Modal onClose={onClose} size="md" ariaLabel="CSV exporteren">
      <div className="p-6 space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">CSV exporteren</h2>
          <p className="text-sm text-slate-500 mt-1 tabular-nums">
            {count} abonnement{count !== 1 ? 'en' : ''} worden geëxporteerd.
          </p>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Velden</span>
          <button onClick={toggleAll} className="text-xs font-medium text-primary hover:underline">
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
                className="rounded border-slate-300 text-primary focus:ring-primary/30"
              />
              <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">{field.label}</span>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Annuleren
          </button>
          <button
            onClick={() => onExport(selected)}
            disabled={selected.size === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-primary shadow-sm hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Exporteren ({selected.size})
          </button>
        </div>
      </div>
    </Modal>
  );
}

function StatusBadge({ status }) {
  const config = {
    actief:   { dot: 'bg-green-500', text: 'text-slate-700', label: 'Actief' },
    verlopen: { dot: 'bg-red-500',   text: 'text-slate-700', label: 'Verlopen' },
    opgezegd: { dot: 'bg-slate-400', text: 'text-slate-500', label: 'Opgezegd' },
  };
  const c = config[status] ?? config.opgezegd;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label ?? status}
    </span>
  );
}

function CostDisplay({ sub }) {
  const hasAccounts = sub.accounts && sub.accounts.length > 0;
  const sym = currencySymbol(sub.currency);
  const fmt = (v) => v.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (sub.cost_period === 'Eenmalig') {
    if (!sub.cost) return <span className="text-slate-300">—</span>;
    return <span className="tabular-nums">{sym}{fmt(parseFloat(sub.cost))} <span className="text-xs text-slate-400">eenmalig</span></span>;
  }

  const monthly = toEurMonthly(sub, {});
  if (!monthly) return <span className="text-slate-300">—</span>;

  const isVariable = sub.is_variable_cost;
  const titleParts = [];
  if (hasAccounts) titleParts.push(`${countActiveAccountsNow(sub.accounts)} actieve accounts`);
  if (sub.base_cost) titleParts.push(`incl. ${sym}${sub.base_cost} vaste licentie`);
  if (isVariable) titleParts.push('Verbruikskosten — bedrag varieert per maand');

  return (
    <span className="tabular-nums" title={titleParts.join(' · ')}>
      {isVariable && <span className="text-slate-400 mr-0.5">±</span>}
      {sym}{fmt(monthly)}<span className="text-xs text-slate-400 ml-0.5 font-normal">/mnd</span>
    </span>
  );
}

function DaysLeft({ date, urgent }) {
  if (!date) return null;
  const days = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
  if (days < 0) return <span className="text-xs text-red-500 font-medium">Verlopen</span>;
  return (
    <span className={`text-xs font-medium tabular-nums ${urgent ? 'text-orange-600' : 'text-slate-400'}`}>
      nog {days}d
    </span>
  );
}

function SubRow({ sub, onView, showUrgency, isSelectable, isSelected, onToggleSelect }) {
  const renewalDate = sub.renewal_date;
  const isUrgent = showUrgency && renewalDate;
  return (
    <tr
      onClick={() => onView(sub)}
      className={`cursor-pointer border-b border-slate-100 last:border-0 transition-colors ${isSelected ? 'bg-primary/5' : 'hover:bg-slate-50'}`}
    >
      {isSelectable && (
        <td className="pl-5 py-3.5 w-10" onClick={(e) => { e.stopPropagation(); onToggleSelect(sub.id); }}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(sub.id)}
            onClick={(e) => e.stopPropagation()}
            className="rounded border-slate-300 text-primary focus:ring-primary/30 cursor-pointer"
            aria-label={`Selecteer ${sub.name}`}
          />
        </td>
      )}
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <SubLogo vendor={sub.vendor} name={sub.name} />
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 text-sm truncate">{sub.name}</p>
            {(() => {
              const hasAccounts = sub.accounts?.length > 0;
              const activeCount = hasAccounts ? countActiveAccountsNow(sub.accounts) : 0;
              const subtitle = hasAccounts
                ? `${activeCount} actieve account${activeCount !== 1 ? 's' : ''}`
                : null;
              return (sub.vendor || subtitle) && (
                <p className="text-xs text-slate-400 mt-0.5 truncate">
                  {sub.vendor}
                  {sub.vendor && subtitle && <span className="mx-1.5 text-slate-300">·</span>}
                  {subtitle && <span className="text-slate-500">{subtitle}</span>}
                </p>
              );
            })()}
          </div>
        </div>
      </td>
      <td className="px-5 py-3 hidden md:table-cell">
        <div className="flex flex-col gap-1">
          {sub.department
            ? <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium w-fit">{sub.department}</span>
            : <span className="text-slate-300 text-xs">—</span>}
          {sub.category && (
            <span className="text-xs text-slate-400 truncate">{sub.category}</span>
          )}
        </div>
      </td>
      <td className="px-5 py-3 text-sm font-semibold text-slate-900">
        <CostDisplay sub={sub} />
      </td>
      <td className="px-5 py-3 hidden lg:table-cell">
        {renewalDate ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-700 tabular-nums">{formatDateLong(renewalDate)}</span>
            {isUrgent && <DaysLeft date={renewalDate} urgent={true} />}
          </div>
        ) : (
          <span className="text-slate-300 text-xs">—</span>
        )}
      </td>
      <td className="px-5 py-3 hidden sm:table-cell">
        <StatusBadge status={sub.status} />
      </td>
    </tr>
  );
}

const COLUMNS = [
  { key: 'name',         label: 'Naam',            className: '' },
  { key: 'category',     label: 'Afdeling',        className: 'hidden md:table-cell' },
  { key: 'cost',         label: 'Kosten',          className: '' },
  { key: 'renewal_date', label: 'Vervaldatum',     className: 'hidden lg:table-cell' },
  { key: 'status',       label: 'Status',          className: 'hidden sm:table-cell' },
];

function Section({ title, rows, onView, showUrgency, accent, isSelectable, selected, onToggleSelect, onToggleAll }) {
  const [open, setOpen] = useState(true);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const getSortVal = (sub, key) => {
    if (key === 'cost') return toMonthly(sub.cost || 0, sub.cost_period);
    if (key === 'renewal_date') return sub.renewal_date || null;
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
    <div className={`bg-white rounded-2xl border ${accent === 'orange' ? 'border-orange-200/80' : 'border-slate-200/70'} overflow-hidden`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/60 transition-colors group"
      >
        <div className="flex items-center gap-2.5">
          {accent === 'orange' && <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
          <span className="font-semibold text-slate-900">{title}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full tabular-nums ${
            accent === 'orange' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'
          }`}>{rows.length}</span>
        </div>
        <ChevronDownIcon className={`h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-all ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <div className="border-t border-slate-100">
          {rows.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-400 text-center">Niets in deze categorie.</p>
          ) : (
            <table className="w-full text-sm table-fixed">
              <colgroup>
                {isSelectable && <col style={{ width: '40px' }} />}
                <col style={{ width: '32%' }} />
                <col className="hidden md:table-column" style={{ width: '20%' }} />
                <col style={{ width: '16%' }} />
                <col className="hidden lg:table-column" style={{ width: '22%' }} />
                <col className="hidden sm:table-column" style={{ width: '10%' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/40">
                  {isSelectable && (
                    <th className="pl-5 py-2.5">
                      <input
                        type="checkbox"
                        checked={rows.length > 0 && rows.every(r => selected.has(r.id))}
                        onChange={() => onToggleAll(rows.map(r => r.id))}
                        className="rounded border-slate-300 text-primary focus:ring-primary/30 cursor-pointer"
                        aria-label="Alles in deze sectie selecteren"
                      />
                    </th>
                  )}
                  {COLUMNS.map(col => {
                    const active = sortKey === col.key;
                    const SortIcon = active ? (sortDir === 'asc' ? ArrowUpIcon : ArrowDownIcon) : ChevronUpDownIcon;
                    return (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        className={`px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors ${active ? 'text-slate-700' : 'text-slate-400 hover:text-slate-600'} ${col.className}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          <SortIcon className={`h-3 w-3 ${active ? 'text-primary' : 'opacity-40'}`} />
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {sorted.map(sub => (
                  <SubRow
                    key={sub.id}
                    sub={sub}
                    onView={onView}
                    showUrgency={showUrgency}
                    isSelectable={isSelectable}
                    isSelected={selected?.has(sub.id) ?? false}
                    onToggleSelect={onToggleSelect}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// Sectie voor gearchiveerde abonnementen — Restore + Definitief verwijderen acties
function ArchiveSection({ rows, totalCount, onView, onRestore, onPermanentDelete }) {
  const [open, setOpen] = useState(false); // dichtgeklapt by default
  // Geen archief totaal → niets renderen. Wel archief, maar gefilterd weg → toon empty state.
  if (totalCount === 0) return null;

  const isFilteredOut = rows.length === 0 && totalCount > 0;

  // Sorteer op archived_at desc (recentste bovenaan)
  const sorted = [...rows].sort((a, b) => new Date(b.archived_at) - new Date(a.archived_at));

  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/60 transition-colors group"
      >
        <div className="flex items-center gap-2.5">
          <span className="font-semibold text-slate-500">Archief</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full tabular-nums bg-slate-100 text-slate-600">
            {isFilteredOut ? `0 van ${totalCount}` : rows.length}
          </span>
        </div>
        <ChevronDownIcon className={`h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-all ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <div className="border-t border-slate-100">
          {isFilteredOut && (
            <div className="px-5 py-6 text-center text-sm text-slate-400">
              Geen gearchiveerde abonnementen voor deze filters.
              <br />
              <span className="text-xs">Pas de filters aan om alle {totalCount} gearchiveerde items te zien.</span>
            </div>
          )}
          {sorted.map(sub => (
            <div
              key={sub.id}
              className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50/40 transition-colors"
            >
              <div
                onClick={() => onView(sub)}
                className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
              >
                <SubLogo vendor={sub.vendor} name={sub.name} />
                <div className="min-w-0">
                  <p className="font-medium text-slate-700 text-sm truncate">{sub.name}</p>
                  <p className="text-xs text-slate-400 truncate tabular-nums">
                    {sub.vendor && <>{sub.vendor} · </>}
                    gearchiveerd {formatDateLong(sub.archived_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => onRestore(sub.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                  title="Herstellen — terug naar actieve lijst"
                >
                  <ArrowUturnLeftIcon className="h-3.5 w-3.5" />
                  Herstellen
                </button>
                <button
                  onClick={() => onPermanentDelete(sub.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                  title="Definitief verwijderen — incl. alle historische cashflow data"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                  Definitief
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SubscriptionsPage() {
  const { subscriptions, loading, addSubscription, updateSubscription, deleteSubscription, restoreSubscription, permanentlyDeleteSubscription, refetch } = useSubscriptions();
  const { categories: settingCategories, types, departments: settingDepartments, addCategory, addType, addDepartment } = useSettings();
  const { isAdmin } = useCurrentUser();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 250);
  const [categoryFilter, setCategoryFilter] = useState(new Set());
  const [billingModelFilter, setBillingModelFilter] = useState(new Set());
  const [departmentFilter, setDepartmentFilter] = useState(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState(null);
  const [detailSub, setDetailSub] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);

  const toggleSelect = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleSelectMany = (ids) => setSelected(prev => {
    const allSelected = ids.length > 0 && ids.every(id => prev.has(id));
    const next = new Set(prev);
    if (allSelected) ids.forEach(id => next.delete(id));
    else ids.forEach(id => next.add(id));
    return next;
  });

  const clearSelection = () => setSelected(new Set());

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    const ids = [...selected];
    let succeeded = 0;
    let failed = 0;
    for (const id of ids) {
      // eslint-disable-next-line no-await-in-loop
      const result = await deleteSubscription(id, { silent: true });
      if (result?.ok) succeeded++;
      else failed++;
    }
    setBulkDeleting(false);
    setBulkDeleteOpen(false);
    clearSelection();
    if (succeeded > 0) toast.success(`${succeeded} abonnement${succeeded !== 1 ? 'en' : ''} verplaatst naar archief.`);
    if (failed > 0) toast.error(`${failed} abonnement${failed !== 1 ? 'en' : ''} kon${failed === 1 ? '' : 'den'} niet gearchiveerd worden.`);
  };

  const handleBulkEdit = async (field, value) => {
    const ids = [...selected];
    const updates = { [field]: value === '' ? null : value };
    let succeeded = 0;
    let failed = 0;
    for (const id of ids) {
      // eslint-disable-next-line no-await-in-loop
      const result = await updateSubscription(id, updates, { silent: true });
      if (result?.error) failed++;
      else succeeded++;
    }
    setBulkEditOpen(false);
    clearSelection();
    if (succeeded > 0) toast.success(`${succeeded} abonnement${succeeded !== 1 ? 'en' : ''} bijgewerkt.`);
    if (failed > 0) toast.error(`${failed} abonnement${failed !== 1 ? 'en' : ''} kon${failed === 1 ? '' : 'den'} niet bijgewerkt worden.`);
  };

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
    const q = debouncedSearch.toLowerCase();
    const matchSearch = sub.name.toLowerCase().includes(q) ||
      (sub.vendor?.toLowerCase().includes(q)) ||
      (sub.contact_name?.toLowerCase().includes(q));
    return matchSearch
      && (categoryFilter.size === 0 || categoryFilter.has(sub.category))
      && (billingModelFilter.size === 0 || billingModelFilter.has(getBillingModel(sub)))
      && (departmentFilter.size === 0 || departmentFilter.has(sub.department));
  });

  const now = new Date();
  const soon = addDays(now, 60);
  // Splits eerst: actieve (niet gearchiveerd) versus archief
  const liveSubscriptions = subscriptions.filter(s => !s.archived_at);
  const archivedSubscriptions = subscriptions.filter(s => s.archived_at);

  const filtered = applyFilters(liveSubscriptions);
  const filteredArchived = applyFilters(archivedSubscriptions);

  const expiringSoon = filtered.filter(s => {
    if (s.status !== 'actief' || s.auto_renew) return false;
    return s.renewal_date && isBefore(new Date(s.renewal_date), soon);
  });
  const expiringSoonIds = new Set(expiringSoon.map(s => s.id));
  const actief   = filtered.filter(s => s.status === 'actief' && !expiringSoonIds.has(s.id));
  const verlopen = filtered.filter(s => s.status === 'verlopen');
  const opgezegd = filtered.filter(s => s.status === 'opgezegd');

  const handleView   = (sub) => setDetailSub(sub);
  const handleEdit   = (sub) => { setDetailSub(null); setEditingSub(sub); setModalOpen(true); };
  const handleAdd    = () => { setEditingSub(null); setModalOpen(true); };
  const handleDelete = async (id) => {
    // Soft delete (archive) — geen confirm nodig, is reversible
    await deleteSubscription(id);
    setDetailSub(null);
  };
  const handleRestore = async (id) => {
    await restoreSubscription(id);
  };
  const handlePermanentDelete = async (id) => {
    if (confirm('Definitief verwijderen? Dit verwijdert het abonnement én alle historische cashflow data. Niet ongedaan te maken.')) {
      await permanentlyDeleteSubscription(id);
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
      return result;
    }
    setModalOpen(false);
    // Refetch zodat de net opgeslagen accounts ook meekomen in de UI
    setTimeout(() => refetch(), 100);
    return result;
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
    link.download = `abonnementen-${formatDate(new Date()).replace(/\//g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setExportModalOpen(false);
  };

  if (loading) return <div className="p-6">Loading...</div>;

  // Tellingen + totalen op basis van LIVE subs (gearchiveerd telt niet mee)
  const totalMonthly = liveSubscriptions
    .filter(s => s.status === 'actief')
    .reduce((sum, s) => sum + (toMonthly(s.cost, s.cost_period) || 0), 0);

  const activeCount = liveSubscriptions.filter(s => s.status === 'actief').length;
  const filterSelectClass = "px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors hover:border-slate-300";

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Abonnementen</h1>
          <p className="text-sm text-slate-500 mt-1 tabular-nums">
            {activeCount} actief · €{totalMonthly.toLocaleString('nl-NL', { maximumFractionDigits: 0 })} / mnd
            {archivedSubscriptions.length > 0 && (
              <>
                {' · '}
                <a
                  href="#archief"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('archief')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="text-slate-400 hover:text-slate-700 underline decoration-dotted underline-offset-2 transition-colors"
                >
                  {archivedSubscriptions.length} in archief
                </a>
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setExportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            CSV
          </button>
          {isAdmin && (
            <button
              onClick={handleAdd}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-primary shadow-sm hover:brightness-110 transition-all"
            >
              <PlusIcon className="h-4 w-4" />
              Nieuw abonnement
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/70 p-3 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Zoek op naam, leverancier of medewerker…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
        </div>
        <MultiSelect
          placeholder="Alle afdelingen"
          selected={departmentFilter}
          onChange={setDepartmentFilter}
          options={departmentsList.map(d => ({
            value: d,
            label: d,
            count: liveSubscriptions.filter(s => s.department === d).length,
          }))}
        />
        <MultiSelect
          placeholder="Alle categorieën"
          selected={categoryFilter}
          onChange={setCategoryFilter}
          options={categories.map(c => ({
            value: c,
            label: c,
            count: liveSubscriptions.filter(s => s.category === c).length,
          }))}
        />
        <MultiSelect
          placeholder="Alle kostenmodellen"
          selected={billingModelFilter}
          onChange={setBillingModelFilter}
          options={BILLING_MODELS.map(m => ({
            value: m.value,
            label: m.label,
            count: liveSubscriptions.filter(s => getBillingModel(s) === m.value).length,
          }))}
        />
      </div>

      {/* Sections */}
      {subscriptions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/70 p-16 text-center">
          <h2 className="text-xl font-semibold text-slate-900">Nog geen abonnementen</h2>
          <p className="text-sm text-slate-500 mt-3 max-w-md mx-auto">
            Voeg je eerste abonnement toe — kosten, evaluaties en verlopingsdatums verschijnen automatisch.
          </p>
          {isAdmin && (
            <button
              onClick={handleAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-primary shadow-sm hover:brightness-110 transition-all mt-6"
            >
              <PlusIcon className="h-4 w-4" />
              Eerste abonnement toevoegen
            </button>
          )}
        </div>
      ) : (
        <>
          {expiringSoon.length > 0 && (
            <Section title="Verloopt binnenkort" rows={expiringSoon} onView={handleView} showUrgency accent="orange"
              isSelectable={isAdmin} selected={selected} onToggleSelect={toggleSelect} onToggleAll={toggleSelectMany} />
          )}
          <Section title="Actief" rows={actief} onView={handleView}
            isSelectable={isAdmin} selected={selected} onToggleSelect={toggleSelect} onToggleAll={toggleSelectMany} />
          <Section title="Verlopen" rows={verlopen} onView={handleView}
            isSelectable={isAdmin} selected={selected} onToggleSelect={toggleSelect} onToggleAll={toggleSelectMany} />
          <Section title="Opgezegd" rows={opgezegd} onView={handleView}
            isSelectable={isAdmin} selected={selected} onToggleSelect={toggleSelect} onToggleAll={toggleSelectMany} />
          {isAdmin && (
            <div id="archief">
              <ArchiveSection
                rows={filteredArchived}
                totalCount={archivedSubscriptions.length}
                onView={handleView}
                onRestore={handleRestore}
                onPermanentDelete={handlePermanentDelete}
              />
            </div>
          )}
        </>
      )}

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

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-xl rounded-full px-5 py-2.5 flex items-center gap-1 shadow-2xl ring-1 ring-white/10">
          <span className="text-sm font-medium text-white tabular-nums px-2">
            {selected.size} geselecteerd
          </span>
          <span className="w-px h-5 bg-slate-700 mx-1" />
          <button
            onClick={() => setBulkEditOpen(true)}
            className="text-sm font-medium text-slate-200 hover:text-white hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors"
          >
            Wijzigen
          </button>
          <button
            onClick={() => setBulkDeleteOpen(true)}
            className="text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded-full transition-colors"
          >
            Verwijderen
          </button>
          <span className="w-px h-5 bg-slate-700 mx-1" />
          <button
            onClick={clearSelection}
            className="text-sm text-slate-400 hover:text-white px-2 py-1.5 rounded-full transition-colors"
            aria-label="Selectie wissen"
          >
            ✕
          </button>
        </div>
      )}

      {bulkEditOpen && (
        <BulkEditModal
          count={selected.size}
          categoryOptions={categories}
          typeOptions={typesList}
          departmentOptions={departmentsList}
          onApply={handleBulkEdit}
          onClose={() => setBulkEditOpen(false)}
        />
      )}

      {bulkDeleteOpen && (
        <Modal onClose={() => !bulkDeleting && setBulkDeleteOpen(false)} size="md" ariaLabel="Bulkarchivering bevestigen">
          <div className="p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Abonnementen archiveren?</h2>
              <p className="text-sm text-slate-500 mt-1">
                Je staat op het punt <strong className="text-slate-900 tabular-nums">{selected.size} abonnement{selected.size !== 1 ? 'en' : ''}</strong> naar het archief te verplaatsen.
                Historische kosten blijven bewaard en je kunt ze later weer terugzetten.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setBulkDeleteOpen(false)}
                disabled={bulkDeleting}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Annuleren
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                {bulkDeleting ? 'Archiveren…' : `Ja, archiveer ${selected.size}`}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default SubscriptionsPage;
