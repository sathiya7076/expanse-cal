/** Identifies the pay period a salary payment belongs to, so one period can only be recorded once. */
export function salaryPeriodKey(dateInput, frequency = 'Monthly') {
  const d = new Date(dateInput);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  if (frequency === 'Monthly') return `${y}-${String(m + 1).padStart(2, '0')}`;
  const days = Math.floor(Date.UTC(y, m, d.getUTCDate()) / 86400000);
  // 1970-01-01 was a Thursday; +3 aligns weeks to start on Monday.
  return frequency === 'Weekly' ? `W${Math.floor((days + 3) / 7)}` : `B${Math.floor((days + 3) / 14)}`;
}
