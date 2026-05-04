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

// Telt actieve accounts in een specifieke maand. Een account is actief als
// start_date <= laatste dag van de maand EN (end_date null OF >= eerste dag).
function countActiveAccountsInMonth(accounts, year, month) {
  if (!accounts?.length) return 0;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  return accounts.filter(a => {
    const start = a.start_date ? new Date(a.start_date) : null;
    const end = a.end_date ? new Date(a.end_date) : null;
    if (start && start > lastDay) return false;
    if (end && end < firstDay) return false;
    return true;
  }).length;
}

// Aantal actieve accounts NU
export function countActiveAccountsNow(accounts) {
  if (!accounts?.length) return 0;
  const now = new Date();
  return countActiveAccountsInMonth(accounts, now.getFullYear(), now.getMonth());
}

// Maandkosten in euro, rekening houdend met seats/accounts en valuta-conversie.
// `rates` is een object zoals { USD: 0.93, GBP: 1.15, CHF: 1.05 } — 1 unit = X EUR.
// Als `sub.accounts` een (niet-lege) array is, wordt cost × aantal-actieve-accounts gebruikt;
// anders valt 'ie terug op de legacy seats × cost berekening.
export function toEurMonthly(sub, rates = {}) {
  const base = toMonthly(sub.cost || 0, sub.cost_period);
  const ratesObj = typeof rates === 'number' ? { USD: rates } : rates;
  const fxRate = sub.currency && sub.currency !== 'EUR'
    ? (ratesObj[sub.currency] ?? 1)
    : 1;

  if (sub.accounts && sub.accounts.length > 0) {
    const activeCount = countActiveAccountsNow(sub.accounts);
    return base * activeCount * fxRate;
  }

  const seatMultiplier = sub.cost_per_seat ? (sub.seats || 1) : 1;
  return base * seatMultiplier * fxRate;
}

// Voor historische berekening (specifieke maand): gebruik account-status in die maand
export function toEurMonthlyFor(sub, year, month, rates = {}) {
  const base = toMonthly(sub.cost || 0, sub.cost_period);
  const ratesObj = typeof rates === 'number' ? { USD: rates } : rates;
  const fxRate = sub.currency && sub.currency !== 'EUR'
    ? (ratesObj[sub.currency] ?? 1)
    : 1;

  if (sub.accounts && sub.accounts.length > 0) {
    const activeCount = countActiveAccountsInMonth(sub.accounts, year, month);
    return base * activeCount * fxRate;
  }

  const seatMultiplier = sub.cost_per_seat ? (sub.seats || 1) : 1;
  return base * seatMultiplier * fxRate;
}
