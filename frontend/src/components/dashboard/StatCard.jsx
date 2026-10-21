import Card from '../ui/Card';
import { formatCurrency } from '../../utils/format';

export default function StatCard({ label, value, icon: Icon, tone = 'text-ink' }) {
  return (
    <Card as="article" aria-label={label} className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-muted">{label}</h3>
        {Icon && <Icon className="size-4 text-muted" aria-hidden="true" />}
      </div>
      <p className={`mt-2 text-xl font-semibold tabular-nums sm:text-2xl ${tone}`}>{formatCurrency(value)}</p>
    </Card>
  );
}
