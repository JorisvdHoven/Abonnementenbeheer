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

// Maandkosten in euro, rekening houdend met seats en valuta-conversie.
// `rates` is een object zoals { USD: 0.93, GBP: 1.15, CHF: 1.05 } — 1 unit = X EUR.
// Voor backwards compat accepteert deze ook een number (interpreted as USD rate).
export function toEurMonthly(sub, rates = {}) {
  const base = toMonthly(sub.cost || 0, sub.cost_period);
  const seatMultiplier = sub.cost_per_seat ? (sub.seats || 1) : 1;
  const ratesObj = typeof rates === 'number' ? { USD: rates } : rates;
  const fxRate = sub.currency && sub.currency !== 'EUR'
    ? (ratesObj[sub.currency] ?? 1)
    : 1;
  return base * seatMultiplier * fxRate;
}
