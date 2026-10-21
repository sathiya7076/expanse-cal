import { MONTHS } from '../../utils/constants';
import { Select } from './Field';

export default function PeriodFilter({ month, year, onMonth, onYear, showMonth = true }) {
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => String(thisYear - 4 + i));
  return (
    <div className="flex gap-3 print:hidden">
      {showMonth && (
        <Select
          label="Month"
          value={month}
          onChange={(e) => onMonth(Number(e.target.value))}
          options={MONTHS.map((m, i) => ({ value: i + 1, label: m }))}
        />
      )}
      <Select label="Year" value={year} onChange={(e) => onYear(Number(e.target.value))} options={years} />
    </div>
  );
}
