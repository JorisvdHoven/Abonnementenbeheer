import { useState, Fragment } from 'react';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { useSettings } from '../hooks/useSettings';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useDebounce } from '../hooks/useDebounce';
import SubscriptionModal from '../components/SubscriptionModal';
import { SubscriptionDetailPanel } from '../components/SubscriptionDetailPanel';
import { AccountDetailPanel } from '../components/AccountDetailPanel';
import { SubLogo } from '../components/SubLogo';
import { AccountAvatar } from '../components/AccountAvatar';
import Modal from '../components/Modal';
import BulkEditModal from '../components/BulkEditModal';
import MultiSelect from '../components/MultiSelect';
import { toast } from '../lib/toast';
import { toMonthly, toEurMonthly, getMonthlyFactor, deriveRenewalDate, countActiveAccountsNow, getBillingModel, BILLING_MODELS, BILLING_MODEL_LABELS } from '../lib/costUtils';
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

// Effectieve auto-verlenging — bij per_account is parent.auto_renew altijd
// false (geforceerd in dataToSave), dus we kijken naar de accounts. Een sub
// 'verlengt' als minstens één actief account auto-verlengt.
function effectiveAutoRenew(sub) {
  if (sub.accounts && sub.accounts.length > 0) {
    return sub.accounts.some(a => !a.archived_at && a.auto_renew);
  }
  return !!sub.auto_renew;
}

// Helper: actieve sub die binnen 30 dagen afloopt en NIET auto-verlengt.
// De oranje "Actief loopt af" is alleen voor deze urgente categorie.
function isActiefLooptAf(sub) {
  if (sub.status !== 'actief' || effectiveAutoRenew(sub)) return false;
  const renewal = deriveRenewalDate(sub);
  if (!renewal) return false;
  const days = Math.ceil((new Date(renewal) - new Date()) / (1000 * 60 * 60 * 24));
  return days >= 0 && days <= 30;
}

// Status-pill — combineert sub.status met auto_renew + tijdsdruk tot 4 varianten.
//
//   actief + (auto_renew of > 30d weg)     → "Actief"           groen
//   actief + auto_renew=false + ≤ 30d      → "Actief loopt af"  oranje
//   verlopen                                → "Verlopen"         rood
//   opgezegd                                → "Opgezegd"         slate
function StatusBadge({ sub }) {
  let dot, text, label;
  if (sub.status === 'verlopen') {
    [dot, text, label] = ['bg-red-500', 'text-slate-700', 'Verlopen'];
  } else if (sub.status === 'opgezegd') {
    [dot, text, label] = ['bg-slate-400', 'text-slate-500', 'Opgezegd'];
  } else if (isActiefLooptAf(sub)) {
    [dot, text, label] = ['bg-orange-500', 'text-orange-700', 'Actief loopt af'];
  } else {
    [dot, text, label] = ['bg-green-500', 'text-slate-700', 'Actief'];
  }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

// Sort-rank voor Status-kolom: urgentie eerst, dan actief, dan inactief.
// 'Actief loopt af' staat boven gewoon Actief omdat het aandacht nodig heeft.
function statusRank(sub) {
  if (sub.status === 'verlopen') return 3;
  if (sub.status === 'opgezegd') return 4;
  if (isActiefLooptAf(sub)) return 0;
  return 1;
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

// Status-tabs bovenaan de tabel. Default = 'actief'. 'alles' toont alles
// in één tabel met een secondary-sort op status zodat actief/verloopt
// altijd boven verlopen/opgezegd staat.
function StatusTabs({ counts, value, onChange }) {
  const tabs = [
    { key: 'actief',   label: 'Actief',   accent: 'bg-green-500' },
    { key: 'verlopen', label: 'Verlopen', accent: 'bg-red-500' },
    { key: 'opgezegd', label: 'Opgezegd', accent: 'bg-slate-400' },
    { key: 'alles',    label: 'Alles',    accent: null },
  ];
  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 p-1 flex flex-wrap gap-1">
      {tabs.map(tab => {
        const isActive = value === tab.key;
        const count = counts[tab.key] ?? 0;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              isActive
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.accent && (
              <span className={`w-1.5 h-1.5 rounded-full ${tab.accent}`} />
            )}
            <span>{tab.label}</span>
            <span className={`text-xs tabular-nums px-1.5 py-0.5 rounded-md ${
              isActive ? 'bg-white/15' : 'bg-slate-100 text-slate-500'
            }`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SubRow({ sub, onView, isSelectable, isSelected, onToggleSelect, isExpanded, onToggleExpand }) {
  // Toon-vervaldatum: bestaande renewal_date óf afgeleid uit start + periode
  // zodat een leeg-DB-veld toch een logische waarde toont in de tabel.
  const renewalDate = deriveRenewalDate(sub);
  const hasAccounts = sub.accounts?.length > 0;
  return (
    <tr
      onClick={() => onView(sub)}
      className={`cursor-pointer border-b border-slate-100 last:border-0 transition-colors ${isSelected ? 'bg-primary/5' : (isExpanded ? 'bg-slate-50/60' : 'hover:bg-slate-50')}`}
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
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900 text-sm truncate">{sub.name}</p>
            {(() => {
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
          {hasAccounts && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleExpand(sub.id); }}
              className={`flex-shrink-0 h-7 w-7 inline-flex items-center justify-center rounded-md transition-all ${
                isExpanded
                  ? 'bg-slate-200 text-slate-700'
                  : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
              }`}
              title={isExpanded ? 'Accounts verbergen' : 'Accounts tonen'}
              aria-label={isExpanded ? 'Accounts verbergen' : 'Accounts tonen'}
              aria-expanded={isExpanded}
            >
              <ChevronDownIcon className={`h-4 w-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
            </button>
          )}
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
          <div className="inline-flex items-center gap-2">
            <span className="text-sm text-slate-700 tabular-nums">{formatDateLong(renewalDate)}</span>
            {effectiveAutoRenew(sub) && sub.status === 'actief' && (
              <span title="Verlengt automatisch" className="text-primary text-base font-semibold leading-none">↻</span>
            )}
          </div>
        ) : (
          <span className="text-slate-300 text-xs">—</span>
        )}
      </td>
      <td className="px-5 py-3 hidden sm:table-cell">
        <StatusBadge sub={sub} />
      </td>
    </tr>
  );
}

const COLUMNS = [
  { key: 'name',         label: 'Naam',              className: '' },
  { key: 'category',     label: 'Afdeling',          className: 'hidden md:table-cell' },
  { key: 'cost',         label: 'Kosten',            className: '' },
  { key: 'renewal_date', label: 'Einddatum periode', className: 'hidden lg:table-cell' },
  { key: 'status',       label: 'Status',            className: 'hidden sm:table-cell' },
];

// Eén rij per account in de uitgeklapte sectie — uitgelijnd met de
// parent-kolommen (naam, afdeling, kosten, vervaldatum, status).
// Read-only — bewerken gebeurt via het detail-panel of de modal.
function AccountExpandedRow({ acc, sub, isSelectable, isLast, onView }) {
  const sym = currencySymbol(sub.currency);

  // Effectieve waardes (fallback op parent indien account-veld leeg).
  // Voor 'end' eerst acc.end_date, anders afleiden uit account's eigen start
  // + periode, anders parent's afgeleide datum — zodat een leeg-DB-veld
  // toch een logische einddatum toont (zelfde patroon als de hoofdrij).
  const period = acc.cost_period || sub.cost_period;
  const start = acc.start_date || sub.start_date;
  const end = acc.end_date
    || deriveRenewalDate({ start_date: start, cost_period: period })
    || deriveRenewalDate(sub);
  const cost = (acc.cost !== null && acc.cost !== undefined && acc.cost !== '')
    ? parseFloat(acc.cost) || 0
    : parseFloat(sub.cost) || 0;
  const monthly = cost * (acc.cost_period
    ? getMonthlyFactor({ ...acc, start_date: start, renewal_date: end })
    : getMonthlyFactor(sub));

  return (
    <tr
      onClick={() => onView?.(acc, sub)}
      className={`bg-slate-50/40 ${onView ? 'cursor-pointer hover:bg-slate-100/60' : ''} transition-colors ${isLast ? '' : 'border-b border-slate-100'}`}
    >
      {isSelectable && <td className="pl-5 py-2.5" />}
      {/* Naam-kolom: avatar + naam (ingedeukt zodat 't visueel een sub-item is) */}
      <td className="px-5 py-2.5">
        <div className="flex items-center gap-3 pl-9">
          <AccountAvatar name={acc.owner_name} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">
              {acc.owner_name || <span className="italic text-slate-400">Zonder naam</span>}
            </p>
            {period && period !== sub.cost_period && (
              <p className="text-xs text-slate-400 truncate">{period}</p>
            )}
          </div>
        </div>
      </td>
      {/* Afdeling-kolom: leeg (afdeling is parent-niveau) */}
      <td className="px-5 py-2.5 hidden md:table-cell" />
      {/* Kosten-kolom: per-account maandelijkse kosten */}
      <td className="px-5 py-2.5 text-sm font-medium text-slate-700 tabular-nums">
        {sym}{monthly.toFixed(2)}
        <span className="text-xs text-slate-400 ml-0.5">/mnd</span>
      </td>
      {/* Einddatum-kolom: account einddatum + ↻ als auto_renew */}
      <td className="px-5 py-2.5 hidden lg:table-cell">
        {end ? (
          <div className="inline-flex items-center gap-2">
            <span className="text-sm text-slate-500 tabular-nums">{formatDateLong(end)}</span>
            {acc.auto_renew && (
              <span title="Verlengt automatisch" className="text-primary text-sm font-semibold leading-none">↻</span>
            )}
          </div>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>
      {/* Status-kolom: leeg (status is parent-niveau) */}
      <td className="px-5 py-2.5 hidden sm:table-cell" />
    </tr>
  );
}

// Volgorde van statussen voor secondary-sort bij 'Alles'-tab.
// Actief eerst, dan verlopen, dan opgezegd.
const STATUS_ORDER = { actief: 0, verlopen: 1, opgezegd: 2 };

// Hoofd-tabel — één flat lijst, geen secties. Default sort op kosten ↓.
// Bij 'alles' wordt secondary-sort op sub.status toegepast zodat
// actieve subs altijd boven verlopen/opgezegde komen, ongeacht de
// gekozen primary sort.
function SubscriptionsTable({ rows, onView, onViewAccount, isSelectable, selected, onToggleSelect, onToggleAll, isAllesTab }) {
  // Default: geen sortering — rij-volgorde uit DB / filter behouden.
  // Bij klik op kolom-header: kosten gaat default naar desc (hoog→laag),
  // andere kolommen naar asc (logische default).
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [expandedSubs, setExpandedSubs] = useState(new Set());

  const toggleExpanded = (id) => {
    setExpandedSubs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'cost' ? 'desc' : 'asc'); }
  };

  const getSortVal = (sub, key) => {
    if (key === 'cost') return (sub.cost || 0) * getMonthlyFactor(sub);
    if (key === 'renewal_date') return deriveRenewalDate(sub) || null;
    if (key === 'status') return statusRank(sub);
    return sub[key] ?? null;
  };

  const sorted = [...rows].sort((a, b) => {
    // Secondary-sort op status bij 'Alles'-tab: actief > expiring > verlopen > opgezegd
    if (isAllesTab) {
      const aRank = STATUS_ORDER[a.status] ?? 99;
      const bRank = STATUS_ORDER[b.status] ?? 99;
      if (aRank !== bRank) return aRank - bRank;
    }
    const aVal = getSortVal(a, sortKey);
    const bVal = getSortVal(b, sortKey);
    if (aVal === null && bVal === null) return 0;
    if (aVal === null) return 1;
    if (bVal === null) return -1;
    if (typeof aVal === 'number') return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    return sortDir === 'asc'
      ? String(aVal).localeCompare(String(bVal), 'nl')
      : String(bVal).localeCompare(String(aVal), 'nl');
  });

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/70 p-12 text-center">
        <p className="text-sm text-slate-400">Geen abonnementen in deze view.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
      <table className="w-full text-sm table-fixed">
        <colgroup>
          {isSelectable && <col style={{ width: '40px' }} />}
          <col style={{ width: '32%' }} />        {/* Naam — meeste ruimte */}
          <col className="hidden md:table-column" style={{ width: '16%' }} />  {/* Afdeling */}
          <col style={{ width: '14%' }} />        {/* Kosten */}
          <col className="hidden lg:table-column" style={{ width: '20%' }} />  {/* Einddatum + ↻ */}
          <col className="hidden sm:table-column" style={{ width: '18%' }} />  {/* Status — 'Actief loopt af' is langer */}
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
                  aria-label="Alle zichtbare abonnementen selecteren"
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
          {sorted.map(sub => {
            const isExpanded = expandedSubs.has(sub.id);
            const liveAccounts = isExpanded
              ? (sub.accounts || []).filter(a => !a.archived_at)
              : [];
            return (
              <Fragment key={sub.id}>
                <SubRow
                  sub={sub}
                  onView={onView}
                  isSelectable={isSelectable}
                  isSelected={selected?.has(sub.id) ?? false}
                  onToggleSelect={onToggleSelect}
                  isExpanded={isExpanded}
                  onToggleExpand={toggleExpanded}
                />
                {isExpanded && liveAccounts.map((acc, idx) => (
                  <AccountExpandedRow
                    key={acc.id || acc._tempId}
                    acc={acc}
                    sub={sub}
                    isSelectable={isSelectable}
                    isLast={idx === liveAccounts.length - 1}
                    onView={onViewAccount}
                  />
                ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
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
  const [statusTab, setStatusTab] = useState('actief'); // 'actief' | 'expiring' | 'verlopen' | 'opgezegd' | 'alles'
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 250);
  const [categoryFilter, setCategoryFilter] = useState(new Set());
  const [billingModelFilter, setBillingModelFilter] = useState(new Set());
  const [departmentFilter, setDepartmentFilter] = useState(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState(null);
  const [detailSub, setDetailSub] = useState(null);
  const [detailAccount, setDetailAccount] = useState(null); // { account, sub }
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

  // Splits eerst: actieve (niet gearchiveerd) versus archief
  const liveSubscriptions = subscriptions.filter(s => !s.archived_at);
  const archivedSubscriptions = subscriptions.filter(s => s.archived_at);

  const filtered = applyFilters(liveSubscriptions);
  const filteredArchived = applyFilters(archivedSubscriptions);

  // Counts per status-tab — gebaseerd op `filtered` (dus respect andere filters
  // zoals afdeling/categorie/zoek). 'verloopt < 30d' is geen aparte tab meer,
  // wel een oranje pill in de Status-kolom binnen de Actief-tab.
  const tabCounts = {
    actief:   filtered.filter(s => s.status === 'actief').length,
    verlopen: filtered.filter(s => s.status === 'verlopen').length,
    opgezegd: filtered.filter(s => s.status === 'opgezegd').length,
    alles:    filtered.length,
  };

  // Rij-set die getoond wordt — gefilterd op de actieve tab.
  const tabFilteredRows = statusTab === 'alles'
    ? filtered
    : filtered.filter(s => s.status === statusTab);

  const handleView        = (sub) => setDetailSub(sub);
  const handleViewAccount = (account, sub) => setDetailAccount({ account, sub });
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
    .reduce((sum, s) => sum + ((s.cost || 0) * getMonthlyFactor(s)), 0);

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
          {/* Status-tabs bovenaan — wisselen tussen status-filtered views */}
          <StatusTabs counts={tabCounts} value={statusTab} onChange={setStatusTab} />

          {/* Hoofd-tabel — flat lijst gefilterd op actieve tab */}
          <SubscriptionsTable
            rows={tabFilteredRows}
            onView={handleView}
            onViewAccount={handleViewAccount}
            isSelectable={isAdmin}
            selected={selected}
            onToggleSelect={toggleSelect}
            onToggleAll={toggleSelectMany}
            isAllesTab={statusTab === 'alles'}
          />

          {/* Archief — collapsable, blijft onderaan */}
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
          onViewAccount={handleViewAccount}
        />
      )}

      {detailAccount && (
        <AccountDetailPanel
          account={detailAccount.account}
          sub={detailAccount.sub}
          onClose={() => setDetailAccount(null)}
          onEditParent={(parentSub) => {
            // Sluit account-panel, open parent in edit-modal
            setDetailAccount(null);
            handleEdit(parentSub);
          }}
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
