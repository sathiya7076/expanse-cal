import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { CHART_COLORS } from '../../utils/constants';
import { formatCompact, formatCurrency } from '../../utils/format';

const money = (v) => formatCurrency(v);

export function IncomeExpenseChart({ income, expenses }) {
  const data = [
    { name: 'Income', value: Number(income) || 0 },
    { name: 'Expenses', value: Number(expenses) || 0 },
  ];
  return (
    <div className="h-64" role="img" aria-label={`Income ${formatCurrency(income)} compared with expenses ${formatCurrency(expenses)}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" />
          <YAxis tickFormatter={formatCompact} width={50} />
          <Tooltip formatter={money} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={d.name} fill={i === 0 ? CHART_COLORS.income : CHART_COLORS.expense} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryPie({ data }) {
  const rows = (data || []).filter((d) => d.total > 0);
  const total = rows.reduce((s, d) => s + d.total, 0);
  return (
    <div className="grid items-center gap-4 sm:grid-cols-2">
      <div className="h-56" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="total" nameKey="category" innerRadius={50} outerRadius={90} paddingAngle={2}>
              {rows.map((r, i) => (
                <Cell key={r.category} fill={CHART_COLORS.pie[i % CHART_COLORS.pie.length]} />
              ))}
            </Pie>
            <Tooltip formatter={money} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Visible list doubles as the text alternative for the chart */}
      <ul className="space-y-2 text-sm">
        {rows.map((r, i) => (
          <li key={r.category} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span className="size-3 rounded-sm" style={{ background: CHART_COLORS.pie[i % CHART_COLORS.pie.length] }} aria-hidden="true" />
              {r.category}
            </span>
            <span className="tabular-nums text-muted">
              {formatCurrency(r.total)} ({total ? Math.round((r.total / total) * 100) : 0}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TrendLine({ data, lines, xKey = 'label', ariaLabel }) {
  return (
    <div className="h-64" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={xKey} />
          <YAxis tickFormatter={formatCompact} width={50} />
          <Tooltip formatter={money} />
          {lines.length > 1 && <Legend />}
          {lines.map((l) => (
            <Line key={l.key} type="monotone" dataKey={l.key} name={l.name} stroke={l.color} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GroupedBars({ data, xKey = 'label', ariaLabel }) {
  return (
    <div className="h-64" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={xKey} />
          <YAxis tickFormatter={formatCompact} width={50} />
          <Tooltip formatter={money} />
          <Legend />
          <Bar dataKey="income" name="Income" fill={CHART_COLORS.income} radius={[4, 4, 0, 0]} />
          <Bar dataKey="expenses" name="Expenses" fill={CHART_COLORS.expense} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
