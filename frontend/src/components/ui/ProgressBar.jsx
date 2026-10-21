const colors = { brand: 'bg-brand-600', warn: 'bg-amber-500', danger: 'bg-expense' };

export default function ProgressBar({ value, tone = 'brand', label }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={label}
      className="h-2.5 w-full overflow-hidden rounded-full bg-line"
    >
      <div className={`h-full rounded-full motion-safe:transition-[width] ${colors[tone]}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
