import { useEffect } from 'react';
import { XMarkIcon, PencilSquareIcon, TrashIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { SubLogo } from './SubLogo';
import { toMonthly, countActiveAccountsNow, getBillingModel, BILLING_MODEL_LABELS } from '../lib/costUtils';
import { formatDate, formatDateLong, currencySymbol } from '../lib/format';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useLatestAuditFor } from '../hooks/useAuditLog';

// ============================================================
// Layout primitives — modern, minimaal
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

// Status met colored dot + label — Linear-stijl
function StatusIndicator({ status }) {
  const dots = {
    actief:   { color: 'bg-green-500', label: 'Actief' },
    verlopen: { color: 'bg-red-500',   label: 'Verlopen' },
    opgezegd: { color: 'bg-slate-400', label: 'Opgezegd' },
  };
  const info = dots[status] ?? { color: 'bg-slate-300', label: status ?? '—' };
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
      <span className={`relative flex w-2 h-2`}>
        {status === 'actief' && <span className={`absolute inline-flex h-full w-full rounded-full ${info.color} opacity-50 animate-ping`} />}
        <span className={`relative inline-flex w-2 h-2 rounded-full ${info.color}`} />
      </span>
      {info.label}
    </span>
  );
}

// Account row binnen de Accounts sectie
function AccountRow({ acc, parentCost, currency }) {
  const today = new Date();
  const start = acc.start_date ? new Date(acc.start_date) : null;
  const end = acc.end_date ? new Date(acc.end_date) : null;
  const isArchived = !!acc.archived_at;
  // Met auto_renew aan: cron houdt end_date in de toekomst, dus altijd actief vanaf start
  const isActive = !isArchived
    && (!start || start <= today)
    && (!end || end >= today || acc.auto_renew);
  const isFuture = !isArchived && start && start > today;
  const stateLabel = isArchived
    ? 'Gearchiveerd'
    : isActive ? 'Actief' : isFuture ? 'Toekomstig' : 'Beëindigd';
  const stateColor = isArchived
    ? 'bg-slate-300'
    : isActive ? 'bg-green-500' : isFuture ? 'bg-blue-500' : 'bg-slate-400';

  const accountCost = acc.cost !== null && acc.cost !== undefined && acc.cost !== ''
    ? parseFloat(acc.cost)
    : null;
  const isCustomPrice = accountCost !== null && accountCost !== parseFloat(parentCost);

  return (
    <div className={`flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0 ${isArchived ? 'opacity-60' : ''}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${stateColor}`} />
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium truncate flex items-center gap-1.5 ${isArchived ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-900'}`}>
          {acc.owner_name || 'Zonder naam'}
          {acc.auto_renew && !isArchived && (
            <span title="Auto-verlenging aan" className="text-[10px] text-primary font-semibold">↻</span>
          )}
        </p>
        <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
          {acc.start_date ? formatDate(acc.start_date) : '?'}
          {' → '}
          {acc.end_date ? formatDate(acc.end_date) : '∞'}
        </p>
      </div>
      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
        {isCustomPrice && (
          <span className="text-sm font-medium text-slate-700 tabular-nums">
            {currencySymbol(currency)}{accountCost.toFixed(2)}
          </span>
        )}
        <span className="text-[11px] uppercase tracking-wide font-medium text-slate-400">{stateLabel}</span>
      </div>
    </div>
  );
}

// ============================================================
// Hoofd-component
// ============================================================

export function SubscriptionDetailPanel({ sub, onClose, onEdit, onDelete }) {
  const { isAdmin } = useCurrentUser();
  const latestAudit = useLatestAuditFor('subscription', sub?.id);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!sub) return null;

  const liveAccounts = (sub.accounts || []).filter(a => !a.archived_at);
  const archivedAccounts = (sub.accounts || []).filter(a => a.archived_at);
  const hasAccounts = (sub.accounts || []).length > 0;
  const hasLiveAccounts = liveAccounts.length > 0;
  const activeAccountCount = hasAccounts ? countActiveAccountsNow(sub.accounts) : 0;
  const baseCost = parseFloat(sub.base_cost) || 0;
  const isVariable = !!sub.is_variable_cost;

  // Variabel deel per periode (per-account of per-seat)
  let variablePerPeriod = parseFloat(sub.cost) || 0;
  if (hasAccounts) {
    const today = new Date();
    variablePerPeriod = liveAccounts
      .filter(a => {
        const start = a.start_date ? new Date(a.start_date) : null;
        const end = a.end_date ? new Date(a.end_date) : null;
        if (start && start > today) return false;
        if (end && end < today && !a.auto_renew) return false;
        return true;
      })
      .reduce((sum, a) => {
        const c = a.cost !== null && a.cost !== undefined && a.cost !== ''
          ? parseFloat(a.cost) || 0
          : parseFloat(sub.cost) || 0;
        return sum + c;
      }, 0);
  } else if (sub.cost_per_seat) {
    variablePerPeriod *= (sub.seats || 1);
  }

  const perPeriodTotal = baseCost + variablePerPeriod;
  const monthly = sub.cost_period && sub.cost_period !== 'Eenmalig'
    ? toMonthly(perPeriodTotal, sub.cost_period)
    : null;

  const sym = currencySymbol(sub.currency);
  const fmtAmount = (v) => v.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col h-full sm:rounded-l-2xl overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-start justify-between mb-3">
            <SubLogo vendor={sub.vendor} name={sub.name} size="lg" />
            <button
              onClick={onClose}
              className="p-1.5 -m-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              aria-label="Sluiten"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <h2 className="text-xl font-bold text-slate-900 leading-tight">{sub.name}</h2>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {sub.vendor && (
              <>
                <span className="text-sm text-slate-400">{sub.vendor}</span>
                <span className="text-slate-300">·</span>
              </>
            )}
            <StatusIndicator status={sub.status} />
            {hasAccounts && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-xs font-medium text-slate-600 tabular-nums">
                  {activeAccountCount} actieve account{activeAccountCount !== 1 ? 's' : ''}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Hero KPI */}
        {monthly !== null && (
          <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-b from-slate-50/50 to-white">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {isVariable ? 'Geschatte maandkosten' : 'Maandkosten'}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-3xl font-bold text-slate-900 tabular-nums leading-none">
                {isVariable && <span className="text-slate-400 mr-1">±</span>}
                {sym}{fmtAmount(monthly)}
              </p>
              <span className="text-sm text-slate-400">/ mnd</span>
            </div>
            <p className="text-xs text-slate-500 mt-2 tabular-nums">
              {isVariable && '± '}
              {sym}{fmtAmount(monthly * 12)} per jaar
              {sub.cost_period && sub.cost_period !== 'Maandelijks' && (
                <> · {isVariable && '± '}{sym}{fmtAmount(perPeriodTotal)} per {sub.cost_period.toLowerCase()}</>
              )}
            </p>
            {baseCost > 0 && (
              <p className="text-xs text-slate-500 mt-1 tabular-nums">
                <span className="text-slate-400">{sym}{fmtAmount(baseCost)} licentie</span>
                <span className="mx-1.5 text-slate-300">+</span>
                <span className="text-slate-400">{isVariable ? '± ' : ''}{sym}{fmtAmount(variablePerPeriod)} {isVariable ? 'verbruik' : 'variabel'}</span>
                {sub.cost_period && sub.cost_period !== 'Maandelijks' && (
                  <span className="text-slate-400"> per {sub.cost_period.toLowerCase()}</span>
                )}
              </p>
            )}
            {isVariable && (
              <p className="text-xs text-orange-600 mt-1.5 inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                Verbruikskosten — bedrag varieert per maand
              </p>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          <Section title="Abonnement">
            <DetailRow label="Categorie" value={sub.category} />
            <DetailRow label="Kostenmodel" value={BILLING_MODEL_LABELS[getBillingModel(sub)]} />
            <DetailRow label="Afdeling" value={sub.department} />
            {!hasAccounts && <DetailRow label="Gebruikers" value={sub.seats} mono />}
          </Section>

          {hasAccounts && (
            <Section title={`Accounts · ${liveAccounts.length}`}>
              <div>
                {liveAccounts.map(acc => (
                  <AccountRow
                    key={acc.id}
                    acc={acc}
                    parentCost={sub.cost}
                    currency={sub.currency}
                  />
                ))}
                {!hasLiveAccounts && (
                  <p className="text-sm text-slate-400 italic py-2">Geen actieve accounts</p>
                )}
              </div>
              {archivedAccounts.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-400 mb-1">
                    Gearchiveerd · {archivedAccounts.length}
                  </p>
                  <div>
                    {archivedAccounts.map(acc => (
                      <AccountRow
                        key={acc.id}
                        acc={acc}
                        parentCost={sub.cost}
                        currency={sub.currency}
                      />
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}

          <Section title="Datums">
            <DetailRow label="Startdatum" value={sub.start_date ? formatDate(sub.start_date) : null} mono />
            <DetailRow label="Vervaldatum" value={sub.renewal_date ? formatDate(sub.renewal_date) : null} mono />
            <DetailRow label="Auto-verlenging" value={sub.auto_renew === true ? 'Ja' : sub.auto_renew === false ? 'Nee' : null} />
          </Section>

          <Section title="Contact">
            <DetailRow label="Naam" value={sub.contact_name} />
            <DetailRow label="Telefoon" value={sub.contact_phone} mono />
            <DetailRow label="E-mail" value={sub.contact_email} />
          </Section>

          {sub.notes && (
            <Section title="Notities">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{sub.notes}</p>
            </Section>
          )}

          {sub.document_content && (
            <Section title="Document">
              <a
                href={sub.document_content}
                download={sub.document_name || `${sub.name}-document`}
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <DocumentArrowDownIcon className="h-4 w-4" />
                {sub.document_name || 'Download'}
              </a>
            </Section>
          )}

          {latestAudit && (
            <p className="text-xs text-slate-400 pt-3 border-t border-slate-100 tabular-nums">
              Laatst {latestAudit.action === 'insert' ? 'aangemaakt' : 'gewijzigd'} door{' '}
              <span className="font-medium text-slate-600">{latestAudit.user_email || 'onbekend'}</span>
              {' '}op {formatDateLong(latestAudit.created_at)}
            </p>
          )}
        </div>

        {/* Footer */}
        {isAdmin && (
          <div className="px-6 py-4 border-t border-slate-100 flex gap-3 bg-white">
            <button
              onClick={() => onEdit(sub)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-110 transition-all"
            >
              <PencilSquareIcon className="h-4 w-4" />
              Bewerken
            </button>
            <button
              onClick={() => onDelete(sub.id)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              aria-label="Verwijderen"
            >
              <TrashIcon className="h-4 w-4" />
              Verwijder
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
