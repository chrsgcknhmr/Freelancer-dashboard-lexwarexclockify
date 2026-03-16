const currencyFmt = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFmt = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const decimalFmt = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const percentFmt = new Intl.NumberFormat('de-DE', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatCurrency(value: number): string {
  return currencyFmt.format(value);
}

export function formatNumber(value: number): string {
  return numberFmt.format(value);
}

export function formatDecimal(value: number): string {
  return decimalFmt.format(value);
}

export function formatPercent(value: number): string {
  return percentFmt.format(value / 100);
}

export function formatHours(value: number): string {
  return `${decimalFmt.format(value)} h`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '–';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
