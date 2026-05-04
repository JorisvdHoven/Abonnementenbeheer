export const BILLING_PERIODS = [
  { value: 'Maandelijks',    label: 'Maandelijks',    factor: 1 },
  { value: 'Per kwartaal',   label: 'Per kwartaal',   factor: 1 / 3 },
  { value: 'Jaarlijks',      label: 'Jaarlijks',      factor: 1 / 12 },
  { value: 'Eenmalig',       label: 'Eenmalig',       factor: 0 },
];

export function toMonthly(cost, period) {
  if (!cost || !period) return cost || 0;
  const match = BILLING_PERIODS.find(p => p.value === period);
  return (cost || 0) * (match?.factor ?? 1);
}

// Is een account actief tussen first en last dag van een maand?
function isAccountActiveInRange(account, firstDay, lastDay) {
  const start = account.start_date ? new Date(account.start_date) : null;
  const end = account.end_date ? new Date(account.end_date) : null;
  if (start && start > lastDay) return false;
  if (end && end < firstDay) return false;
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

// Maandkosten in euro, rekening houdend met seats/accounts en valuta-conversie.
// `rates` is een object zoals { USD: 0.93, GBP: 1.15, CHF: 1.05 } — 1 unit = X EUR.
// Multi-account: somt per actieve account (eigen cost of parent.cost als fallback);
// Legacy: cost × seats logica.
export function toEurMonthly(sub, rates = {}) {
  const ratesObj = typeof rates === 'number' ? { USD: rates } : rates;
  const fxRate = sub.currency && sub.currency !== 'EUR'
    ? (ratesObj[sub.currency] ?? 1)
    : 1;

  if (sub.accounts && sub.accounts.length > 0) {
    const active = activeAccountsInMonth(sub.accounts, new Date().getFullYear(), new Date().getMonth());
    const totalCost = active.reduce((sum, a) => sum + effectiveAccountCost(a, sub.cost), 0);
    return toMonthly(totalCost, sub.cost_period) * fxRate;
  }

  const base = toMonthly(sub.cost || 0, sub.cost_period);
  const seatMultiplier = sub.cost_per_seat ? (sub.seats || 1) : 1;
  return base * seatMultiplier * fxRate;
}

// Voor historische berekening (specifieke maand): gebruik account-status in die maand
export function toEurMonthlyFor(sub, year, month, rates = {}) {
  const ratesObj = typeof rates === 'number' ? { USD: rates } : rates;
  const fxRate = sub.currency && sub.currency !== 'EUR'
    ? (ratesObj[sub.currency] ?? 1)
    : 1;

  if (sub.accounts && sub.accounts.length > 0) {
    const active = activeAccountsInMonth(sub.accounts, year, month);
    const totalCost = active.reduce((sum, a) => sum + effectiveAccountCost(a, sub.cost), 0);
    return toMonthly(totalCost, sub.cost_period) * fxRate;
  }

  const base = toMonthly(sub.cost || 0, sub.cost_period);
  const seatMultiplier = sub.cost_per_seat ? (sub.seats || 1) : 1;
  return base * seatMultiplier * fxRate;
}
