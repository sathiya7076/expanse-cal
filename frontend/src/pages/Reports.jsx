import { useState } from 'react';
import { FiDownload, FiPrinter } from 'react-icons/fi';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ErrorMessage from '../components/ui/ErrorMessage';
import PageHeader from '../components/ui/PageHeader';
import PeriodFilter from '../components/ui/PeriodFilter';
import Spinner from '../components/ui/Spinner';
import StatCard from '../components/dashboard/StatCard';
import { GroupedBars, TrendLine } from '../components/dashboard/Charts';
import useFetch from '../hooks/useFetch';
import { getCategoryReport, getMonthlyReport, getYearlyReport } from '../services/dashboard';
import { transactionsApi } from '../services/resources';
import { CHART_COLORS, MONTHS, SALARY_CATEGORY } from '../utils/constants';
import { downloadFile, formatCurrency, formatDate, toCsv } from '../utils/format';

function DataTable({ caption, columns, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-line text-muted">
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={`px-3 py-2 font-medium ${c.right ? 'text-right' : ''}`}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c.key} className={`px-3 py-2 tabular-nums ${c.right ? 'text-right' : ''}`}>{c.render ? c.render(r) : r[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section({ title, state, children }) {
  return (
    <Card aria-label={title}>
      <h2 className="mb-4 font-semibold">{title}</h2>
      {state.loading ? <Spinner className="py-10" /> : state.error ? <ErrorMessage message={state.error} onRetry={state.refetch} /> : children}
    </Card>
  );
}

export default function Reports() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const monthly = useFetch(() => getMonthlyReport({ year, month }), [year, month]);
  const yearly = useFetch(() => getYearlyReport({ year }), [year]);
  const cats = useFetch(() => getCategoryReport({ year, month }), [year, month]);
  const salary = useFetch(
    () => transactionsApi.list({ type: 'income', category: SALARY_CATEGORY, from: `${year}-01-01`, to: `${year}-12-31`, sort: 'date', order: 'desc' }),
    [year]
  );

  const months = (yearly.data?.months || []).map((m) => ({
    ...m,
    label: MONTHS[m.month - 1]?.slice(0, 3),
    net: (m.income || 0) - (m.expenses || 0),
  }));
  const daily = (monthly.data?.daily || []).map((d) => ({ ...d, label: new Date(d.date).getDate() }));
  const weekly = monthly.data?.weekly || [];
  const summary = monthly.data?.summary || {};
  const categories = Array.isArray(cats.data) ? [...cats.data].sort((a, b) => b.total - a.total) : [];
  const payments = Array.isArray(salary.data) ? salary.data : [];

  const exportCsv = () => {
    const rows = [
      ...months.map((m) => ({ section: 'Yearly summary', label: m.label, income: m.income, expenses: m.expenses, net: m.net })),
      ...categories.map((c) => ({ section: `Categories ${MONTHS[month - 1]} ${year}`, label: c.category, income: '', expenses: c.total, net: '' })),
    ];
    if (!rows.length) return;
    downloadFile(`smartspend-report-${year}-${String(month).padStart(2, '0')}.csv`, toCsv(rows));
  };

  return (
    <>
      <PageHeader
        title="Reports"
        description="Daily, weekly, monthly and yearly views of your income and spending."
        actions={
          <>
            <PeriodFilter month={month} year={year} onMonth={setMonth} onYear={setYear} />
            <Button variant="secondary" className="self-end" onClick={exportCsv}><FiDownload aria-hidden="true" /> CSV</Button>
            <Button variant="secondary" className="self-end" onClick={() => window.print()}><FiPrinter aria-hidden="true" /> PDF</Button>
          </>
        }
      />

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label={`Income, ${MONTHS[month - 1]}`} value={summary.income} tone="text-income" />
          <StatCard label={`Expenses, ${MONTHS[month - 1]}`} value={summary.expenses} tone="text-expense" />
          <StatCard label="Income minus expenses" value={summary.net ?? (summary.income || 0) - (summary.expenses || 0)} />
        </div>

        <Section title={`Daily income and expenses, ${MONTHS[month - 1]} ${year}`} state={monthly}>
          <GroupedBars data={daily} ariaLabel="Bar chart of income and expenses for each day of the month" />
        </Section>

        <Section title="Weekly summary" state={monthly}>
          <DataTable
            caption="Weekly income and expenses"
            columns={[
              { key: 'label', label: 'Week' },
              { key: 'income', label: 'Income', right: true, render: (r) => formatCurrency(r.income) },
              { key: 'expenses', label: 'Expenses', right: true, render: (r) => formatCurrency(r.expenses) },
            ]}
            rows={weekly}
          />
        </Section>

        <Section title={`Yearly summary, ${year}`} state={yearly}>
          <GroupedBars data={months} ariaLabel="Bar chart of income and expenses for each month of the year" />
          <h3 className="mb-2 mt-6 text-sm font-semibold">Net trend (income minus expenses)</h3>
          <TrendLine data={months} lines={[{ key: 'net', name: 'Net', color: CHART_COLORS.net }]} ariaLabel="Line chart of income minus expenses for each month" />
        </Section>

        <Section title={`Spending by category, ${MONTHS[month - 1]} ${year}`} state={cats}>
          {categories.length ? (
            <DataTable
              caption="Expenses by category, highest first"
              columns={[
                { key: 'category', label: 'Category' },
                { key: 'total', label: 'Spent', right: true, render: (r) => formatCurrency(r.total) },
              ]}
              rows={categories}
            />
          ) : (
            <p className="text-sm text-muted">No expenses recorded for this month.</p>
          )}
        </Section>

        <Section title={`Salary history, ${year}`} state={salary}>
          {payments.length ? (
            <DataTable
              caption="Salary payments"
              columns={[
                { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
                { key: 'description', label: 'Description' },
                { key: 'amount', label: 'Amount', right: true, render: (r) => formatCurrency(r.amount) },
              ]}
              rows={payments}
            />
          ) : (
            <p className="text-sm text-muted">No salary payments recorded this year.</p>
          )}
        </Section>
      </div>
    </>
  );
}
