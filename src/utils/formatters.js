export function formatCurrency(value = 0, currency = 'FCFA') {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) {
    return `0 ${currency}`;
  }

  const formatted = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(numeric);

  return `${formatted} ${currency}`;
}

export function formatNumber(value = 0) {
  return Number(value || 0).toLocaleString('fr-FR');
}

export function formatDate(dateValue) {
  if (!dateValue) return '—';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;
  return date.toLocaleDateString('fr-FR');
}
