// Factor formule: monthly_equivalent = cost × (365/12) / dagen_in_periode
// → maandelijks ≈ 30.4 dagen → 1.0; jaarlijks 365 → 1/12; etc.
// 'Anders' heeft factor=null en wordt dynamisch berekend uit start_date + renewal_date
export const BILLING_PERIODS = [
  { value: 'Maandelijks',   label: 'Maandelijks',   factor: 1 },
  { value: 'Wekelijks',     label: 'Wekelijks',     factor: (365 / 12) / 7 },
  { value: 'Per kwartaal',  label: 'Per kwartaal',  factor: 1 / 3 },
  { value: 'Halfjaarlijks', label: 'Halfjaarlijks', factor: 1 / 6 },
  { value: 'Jaarlijks',     label: 'Jaarlijks',     factor: 1 / 12 },
  { value: 'Eenmalig',      label: 'Eenmalig',      factor: 0 },
  { value: 'Anders',        label: 'Anders…',       factor: null },
];

// Dynamische factor: gebruikt vaste tabel voor bekende periodes, en berekent
// uit start→renewal voor 'Anders'. Retourneert 0 bij ongeldige Anders-data
// (geen dates, of renewal <= start).
export function getMonthlyFactor(sub) {
  if (!sub?.cost_period) return 1;
  if (sub.cost_period === 'Anders') {
    if (!sub.start_date || !sub.renewal_date) return 0;
    const start = new Date(sub.start_date);
    const renewal = new Date(sub.renewal_date);
    const days = (renewal - start) / (1000 * 60 * 60 * 24);
    if (days <= 0) return 0;
    return (365 / 12) / days;
  }
  const match = BILLING_PERIODS.find(p => p.value === sub.cost_period);
  return match?.factor ?? 1;
}

// Pricing model — afgeleid uit de bestaande velden. Eén bron van waarheid.
export const BILLING_MODELS = [
  { value: 'flat',                label: 'Vast bedrag' },
  { value: 'per_seat',            label: 'Per gebruiker' },
  { value: 'per_account',         label: 'Per persoonlijk account' },
  { value: 'license_plus_seats',  label: 'Vaste licentie + per gebruiker' },
  { value: 'variable',            label: 'Op basis van verbruik' },
];

export const BILLING_MODEL_LABELS = Object.fromEntries(
  BILLING_MODELS.map(m => [m.value, m.label])
);

export function getBillingModel(sub) {
  if (!sub) return 'flat';
  if (sub.is_variable_cost) return 'variable';
  if (sub.accounts && sub.accounts.some(a => !a.archived_at)) return 'per_account';
  if (sub.base_cost && parseFloat(sub.base_cost) > 0) return 'license_plus_seats';
  if (sub.cost_per_seat) return 'per_seat';
  return 'flat';
}

export function toMonthly(cost, period) {
  if (!cost || !period) return cost || 0;
  const match = BILLING_PERIODS.find(p => p.value === period);
  return (cost || 0) * (match?.factor ?? 1);
}

// Is een account actief tussen first en last dag van een maand?
// Met auto_renew = true wordt end_date door de cron in de toekomst gehouden,
// dus account telt als actief zolang start_date <= laatste dag van de maand.
// Met archived_at gezet: account is alleen actief in maanden VOOR archived_at.
function isAccountActiveInRange(account, firstDay, lastDay) {
  const start = account.start_date ? new Date(account.start_date) : null;
  const end = account.end_date ? new Date(account.end_date) : null;
  const archivedAt = account.archived_at ? new Date(account.archived_at) : null;
  if (start && start > lastDay) return false;
  if (end && end < firstDay && !account.auto_renew) return false;
  if (archivedAt && archivedAt < firstDay) return false;
  return true;
}

// Telt actieve accounts in een specifieke maand
function activeAccountsInMonth(accounts, year, month) {
  if (!accounts?.length) return [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  return accounts.filter(a => isAccountActiveInRange(a, firstDay, lastDay));
}

// Filter: welke accounts zijn NU actief (UI badges, modal preview, lijst).
// Strikter dan activeAccountsInMonth: zodra archived_at gezet is, telt het account
// niet meer mee — ook al valt archived_at binnen de huidige maand. (Historische
// kosten blijven wel in snapshots staan via toEurMonthlyFor / activeAccountsInMonth.)
export function activeAccountsNow(accounts) {
  if (!accounts?.length) return [];
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return accounts.filter(a => {
    if (a.archived_at) return false;
    const start = a.start_date ? new Date(a.start_date) : null;
    if (start && start > lastDay) return false;
    const end = a.end_date ? new Date(a.end_date) : null;
    if (end && end < now && !a.auto_renew) return false;
    return true;
  });
}

// Aantal accounts dat NU actief is — gebruikt door UI badges/counts.
export function countActiveAccountsNow(accounts) {
  return activeAccountsNow(accounts).length;
}

// Effectieve kosten van een account: eigen cost als die er is, anders parent.cost
function effectiveAccountCost(account, parentCost) {
  if (account.cost !== null && account.cost !== undefined && account.cost !== '') {
    return parseFloat(account.cost) || 0;
  }
  return parentCost || 0;
}

// Per-account factor: gebruikt account.cost_period als die gezet is, anders parent.
// Voor 'Anders' op account-niveau: cycluslengte = (account.end_date - account.start_date)
// in dagen, fallback op (parent.renewal_date - parent.start_date).
function accountMonthlyFactor(account, parentSub) {
  const period = account.cost_period || parentSub.cost_period;
  if (!period) return 1;
  if (period === 'Anders') {
    const start = account.start_date || parentSub.start_date;
    const end = account.end_date || parentSub.renewal_date;
    if (!start || !end) return 0;
    const days = (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24);
    if (days <= 0) return 0;
    return (365 / 12) / days;
  }
  const match = BILLING_PERIODS.find(p => p.value === period);
  return match?.factor ?? 1;
}

// Bereken maandkosten in source currency (zonder fx). Bij accounts: per-account
// factor toepassen op per-account cost. Plus base_cost × parent factor. Zonder
// accounts: (cost × seats + base) × parent factor.
function monthlyNative(sub, accountsForMonth) {
  const base = parseFloat(sub.base_cost) || 0;
  const parentFactor = getMonthlyFactor(sub);

  if (sub.accounts && sub.accounts.length > 0) {
    const accountsTotal = accountsForMonth.reduce((sum, a) => {
      const c = effectiveAccountCost(a, sub.cost);
      return sum + c * accountMonthlyFactor(a, sub);
    }, 0);
    return base * parentFactor + accountsTotal;
  }

  const seatMultiplier = sub.cost_per_seat ? (sub.seats || 1) : 1;
  const flat = (parseFloat(sub.cost) || 0) * seatMultiplier + base;
  return flat * parentFactor;
}

// Maandkosten in euro, rekening houdend met base_cost, seats/accounts en valuta-conversie.
// `rates` is een object zoals { USD: 0.93, GBP: 1.15, CHF: 1.05 } — 1 unit = X EUR.
export function toEurMonthly(sub, rates = {}) {
  const ratesObj = typeof rates === 'number' ? { USD: rates } : rates;
  const fxRate = sub.currency && sub.currency !== 'EUR'
    ? (ratesObj[sub.currency] ?? 1)
    : 1;

  const activeAccts = sub.accounts && sub.accounts.length > 0
    ? activeAccountsInMonth(sub.accounts, new Date().getFullYear(), new Date().getMonth())
    : [];

  return monthlyNative(sub, activeAccts) * fxRate;
}

// Voor historische berekening (specifieke maand): gebruik account-status in die maand
export function toEurMonthlyFor(sub, year, month, rates = {}) {
  const ratesObj = typeof rates === 'number' ? { USD: rates } : rates;
  const fxRate = sub.currency && sub.currency !== 'EUR'
    ? (ratesObj[sub.currency] ?? 1)
    : 1;

  const activeAccts = sub.accounts && sub.accounts.length > 0
    ? activeAccountsInMonth(sub.accounts, year, month)
    : [];

  return monthlyNative(sub, activeAccts) * fxRate;
}
