// Datum- en valutaformatters — gebruikt door de hele app voor consistente weergave.

// Geeft 'dd-mm-jjjj' met leading zeros (bv. 06-09-2026). Bewust niet via
// toLocaleDateString omdat die in NL-locale standaard '6-9-2026' geeft —
// inconsistente kolombreedte in tabellen.
export function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d)) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export function formatDateLong(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const CURRENCY_SYMBOLS = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  CHF: 'Fr.',
};

export const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'];

export function currencySymbol(currency) {
  return CURRENCY_SYMBOLS[currency] ?? '€';
}
