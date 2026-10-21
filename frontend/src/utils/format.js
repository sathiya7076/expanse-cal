const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const compactFmt = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 });

export const formatCurrency = (value) => inr.format(Number(value) || 0);
export const formatCompact = (value) => compactFmt.format(Number(value) || 0);

export const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Not set';

// <input type="date"> needs YYYY-MM-DD
export const toInputDate = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');
export const today = () => new Date().toISOString().slice(0, 10);

// The API may return a bare array or wrap it ({ transactions: [...] } / { data: [...] }).
export const unwrap = (res, key) => {
  const d = res.data;
  if (Array.isArray(d)) return d;
  return d?.[key] ?? d?.data ?? d;
};

export const toCsv = (rows) => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
};

export const downloadFile = (filename, content, type = 'text/csv;charset=utf-8') => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
