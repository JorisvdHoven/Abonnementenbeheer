// Datum- en valutaformatters — gebruikt door de hele app voor consistente weergave.

export function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('nl-NL');
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
