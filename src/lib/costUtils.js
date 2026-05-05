export const BILLING_PERIODS = [
  { value: 'Maandelijks',    label: 'Maandelijks',    factor: 1 },
  { value: 'Per kwartaal',   label: 'Per kwartaal',   factor: 1 / 3 },
  { value: 'Jaarlijks',      label: 'Jaarlijks',      factor: 1 / 12 },
  { value: 'Eenmalig',       label: 'Eenmalig',       factor: 0 },
];

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
  if (sub.accounts && sub.accounts.length > 0) return 'per_account';
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
function isAccountActiveInRange(account, firstDay, lastDay) {
  const start = account.start_date ? new Date(account.start_date) : null;
  const end = account.end_date ? new Date(account.end_date) : null;
  if (start && start > lastDay) return false;
  if (end && end < firstDay && !account.auto_renew) return false;
  return true;
}

// Telt actieve accounts in een specifieke maand
function activeAccountsInMonth(accounts, year, month) {
  if (!accounts?.length) return [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  return accounts.filter(a => isAccountActiveInRange(a, firstDay, lastDay));
}

// Aantal actieve accounts NU
export function countActiveAccountsNow(accounts) {
  if (!accounts?.length) return 0;
  const now = new Date();
  return activeAccountsInMonth(accounts, now.getFullYear(), now.getMonth()).length;
}

// Effectieve kosten van een account: eigen cost als die er is, anders parent.cost
function effectiveAccountCost(account, parentCost) {
  if (account.cost !== null && account.cost !== undefined && account.cost !== '') {
    return parseFloat(account.cost) || 0;
  }
  return parentCost || 0;
}

// Bereken het variabele deel (per-account of per-seat) per periode (zonder base_cost)
function variablePerPeriod(sub, accountsForMonth) {
  if (sub.accounts && sub.accounts.length > 0) {
    return accountsForMonth.reduce((sum, a) => sum + effectiveAccountCost(a, sub.cost), 0);
  }
  const seatMultiplier = sub.cost_per_seat ? (sub.seats || 1) : 1;
  return (parseFloat(sub.cost) || 0) * seatMultiplier;
}

// Maandkosten in euro, rekening houdend met base_cost, seats/accounts en valuta-conversie.
// `rates` is een object zoals { USD: 0.93, GBP: 1.15, CHF: 1.05 } — 1 unit = X EUR.
// Totaal = base_cost + variabel deel, beide door cost_period factor en fx rate.
export function toEurMonthly(sub, rates = {}) {
  const ratesObj = typeof rates === 'number' ? { USD: rates } : rates;
  const fxRate = sub.currency && sub.currency !== 'EUR'
    ? (ratesObj[sub.currency] ?? 1)
    : 1;

  const activeAccts = sub.accounts && sub.accounts.length > 0
    ? activeAccountsInMonth(sub.accounts, new Date().getFullYear(), new Date().getMonth())
    : [];
  const variable = variablePerPeriod(sub, activeAccts);
  const base = parseFloat(sub.base_cost) || 0;
  const totalPerPeriod = base + variable;

  return toMonthly(totalPerPeriod, sub.cost_period) * fxRate;
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
  const variable = variablePerPeriod(sub, activeAccts);
  const base = parseFloat(sub.base_cost) || 0;
  const totalPerPeriod = base + variable;

  return toMonthly(totalPerPeriod, sub.cost_period) * fxRate;
}
