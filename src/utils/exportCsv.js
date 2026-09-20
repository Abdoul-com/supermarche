export function exportCsv(rows = [], filename = 'rapport.csv') {
  if (!Array.isArray(rows) || !rows.length) {
    return false;
  }

  const escapeCell = (value) => {
    const raw = value == null ? '' : String(value);
    if (/[",\n]/.test(raw)) {
      return `"${raw.replace(/"/g, '""')}"`;
    }
    return raw;
  };

  const csv = rows
    .map((row) => row.map((cell) => escapeCell(cell)).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return true;
}

export default exportCsv;
