import { useEffect } from 'react';
import { XMarkIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { AccountAvatar } from './AccountAvatar';
import { SubLogo } from './SubLogo';
import { getMonthlyFactor, deriveRenewalDate } from '../lib/costUtils';
import { formatDate, currencySymbol } from '../lib/format';
import { useCurrentUser } from '../hooks/useCurrentUser';

// ============================================================
// Layout primitives — kopie van SubscriptionDetailPanel-stijl
// ============================================================

function DetailRow({ label, value, mono = false }) {
  const empty = value === null || value === undefined || value === '';
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm text-right ${empty ? 'text-slate-300' : 'text-slate-900 font-medium'} ${mono ? 'tabular-nums' : ''}`}>
        {empty ? '—' : value}
      </span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">{title}</h3>
      <div>{children}</div>
    </section>
  );
}

// ============================================================
// AccountDetailPanel — read-only preview van 1 account binnen een
// per_account abonnement. Right-side panel — zelfde stijl als
// SubscriptionDetailPanel zodat het visueel consistent oogt.
// Z-index 50 (boven SubscriptionDetailPanel z-40), zodat ze stackbaar
// zijn als gebruiker vanuit parent-panel een account opent.
// ============================================================

export function AccountDetailPanel({ account, sub, onClose, onEditParent }) {
  const { isAdmin } = useCurrentUser();
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!account || !sub) return null;

  const sym = currencySymbol(sub.currency);
  const fmt = (v) => v.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Effectieve waardes (account-eigen of inherit van parent)
  const period      = account.cost_period || sub.cost_period;
  const startDate   = account.start_date || sub.start_date;
  const endDate     = account.end_date   || deriveRenewalDate(sub);
  const isCustomCost = account.cost !== null && account.cost !== undefined && account.cost !== '';
  const cost = isCustomCost ? parseFloat(account.cost) : parseFloat(sub.cost) || 0;

  // Maandkosten in source currency — gebruik account-eigen factor als eigen periode,
  // anders parent-factor.
  const monthlyFactor = account.cost_period
    ? getMonthlyFactor({ cost_period: account.cost_period, start_date: startDate, renewal_date: endDate })
    : getMonthlyFactor(sub);
  const monthly = cost * monthlyFactor;

  const isArchived = !!account.archived_at;
  const today = new Date();
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  const isActive = !isArchived
    && (!start || start <= today)
    && (!end || end >= today || account.auto_renew);
  const stateLabel = isArchived ? 'Gearchiveerd' : isActive ? 'Actief' : 'Beëindigd';
  const stateDot = isArchived ? 'bg-slate-300' : isActive ? 'bg-green-500' : 'bg-slate-400';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 w-full max-w-md bg-white shadow-2xl flex flex-col h-full sm:rounded-l-2xl overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-start justify-between mb-3">
            <AccountAvatar name={account.owner_name} size="md" />
            <button
              onClick={onClose}
              className="p-1.5 -m-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              aria-label="Sluiten"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 truncate">
            {account.owner_name || <span className="italic text-slate-400">Zonder naam</span>}
          </h2>
          <div className="flex items-center gap-2 mt-1.5 text-sm">
            <span className="text-slate-500">Account onder</span>
            <span className="inline-flex items-center gap-1.5 min-w-0">
              <SubLogo vendor={sub.vendor} name={sub.name} size="xs" />
              <span className="text-slate-700 font-medium truncate">{sub.name}</span>
            </span>
            <span className="text-slate-300">·</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
              <span className={`w-1.5 h-1.5 rounded-full ${stateDot}`} />
              {stateLabel}
            </span>
          </div>
        </div>

        {/* Maandkosten card */}
        <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-b from-slate-50/40 to-white">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Maandkosten</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-slate-900 tabular-nums leading-none">
              {sym}{fmt(monthly)}
            </p>
            <span className="text-sm text-slate-400">/ mnd</span>
          </div>
          {!isCustomCost && (
            <p className="text-xs text-slate-400 mt-2">
              Gebruikt standaardprijs van {sub.name} ({sym}{fmt(parseFloat(sub.cost) || 0)} per {period?.toLowerCase() || 'periode'}).
            </p>
          )}
          {isCustomCost && (
            <p className="text-xs text-slate-500 mt-2 tabular-nums">
              Eigen prijs: {sym}{fmt(cost)} per {period?.toLowerCase() || 'periode'}
            </p>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          <Section title="Cyclus">
            <DetailRow label="Facturatieperiode" value={period} />
            <DetailRow
              label="Auto-verlenging"
              value={
                account.auto_renew
                  ? <span className="inline-flex items-center gap-1.5">Ja <span className="text-primary text-base font-semibold leading-none">↻</span></span>
                  : 'Nee'
              }
            />
          </Section>

          <Section title="Datums">
            <DetailRow label="Startdatum" value={startDate ? formatDate(startDate) : null} mono />
            <DetailRow
              label={account.cost_period === 'Eenmalig' ? 'Datum aankoop' : 'Einddatum periode'}
              value={endDate ? formatDate(endDate) : null}
              mono
            />
            {isArchived && (
              <DetailRow label="Gearchiveerd op" value={formatDate(account.archived_at)} mono />
            )}
          </Section>

        </div>

        {/* Footer met bewerken-knop — opent SubscriptionModal van de parent.
            De gebruiker komt in de accounts-lijst van het parent abo en kan
            daar de account-velden aanpassen. */}
        {isAdmin && onEditParent && (
          <div className="px-6 py-4 border-t border-slate-100 flex gap-3 bg-white">
            <button
              onClick={() => onEditParent(sub)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-110 transition-all"
            >
              <PencilSquareIcon className="h-4 w-4" />
              Account bewerken
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
