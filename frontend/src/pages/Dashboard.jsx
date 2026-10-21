import { useState } from 'react';
import { FiArrowDownCircle, FiArrowUpCircle, FiBriefcase, FiInbox, FiPlusCircle, FiTarget } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import ErrorMessage from '../components/ui/ErrorMessage';
import PageHeader from '../components/ui/PageHeader';
import PeriodFilter from '../components/ui/PeriodFilter';
import Spinner from '../components/ui/Spinner';
import StatCard from '../components/dashboard/StatCard';
import { CategoryPie, IncomeExpenseChart, TrendLine } from '../components/dashboard/Charts';
import useFetch from '../hooks/useFetch';
import { getSummary } from '../services/dashboard';
import { CHART_COLORS, MONTHS } from '../utils/constants';
import { formatCurrency, formatDate } from '../utils/format';

export default function Dashboard() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const { data: d, loading, error, refetch } = useFetch(() => getSummary({ month, year }), [month, year]);

  return (
    <>
      <PageHeader title="Dashboard" description="Your money for the selected month, from your own records." actions={<PeriodFilter month={month} year={year} onMonth={setMonth} onYear={setYear} />} />

      {loading ? (
        <Spinner label="Loading summary" />
      ) : error ? (
        <ErrorMessage message={error} onRetry={refetch} />
      ) : (
        <div className="space-y-6">
          <section aria-label="Remaining balance" className="rounded-2xl bg-ink p-6 text-white sm:p-8">
            <p className="text-sm text-white/70">Remaining balance for {MONTHS[month - 1]} {year}</p>
            <p className="mt-2 text-4xl font-semibold tabular-nums sm:text-6xl">{formatCurrency(d.remainingBalance)}</p>
            <p className="mt-4 text-sm tabular-nums text-white/70">
              {formatCurrency(d.totalIncome)} income − {formatCurrency(d.totalExpenses)} expenses
            </p>
          </section>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <StatCard label="Monthly salary" value={d.monthlySalary} icon={FiBriefcase} />
            <StatCard label="Additional income" value={d.additionalIncome} icon={FiPlusCircle} />
            <StatCard label="Total income" value={d.totalIncome} icon={FiArrowDownCircle} tone="text-income" />
            <StatCard label="Total expenses" value={d.totalExpenses} icon={FiArrowUpCircle} tone="text-expense" />
            <StatCard label="Total savings" value={d.totalSavings} icon={FiTarget} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card aria-labelledby="ie-title">
              <h2 id="ie-title" className="mb-4 font-semibold">Income versus expenses</h2>
              <IncomeExpenseChart income={d.totalIncome} expenses={d.totalExpenses} />
            </Card>
            <Card aria-labelledby="cat-title">
              <h2 id="cat-title" className="mb-1 font-semibold">Spending by category</h2>
              {d.highestCategory && (
                <p className="mb-4 text-sm text-muted">
                  Highest: <strong className="text-ink">{d.highestCategory.category}</strong> at {formatCurrency(d.highestCategory.total)}
                </p>
              )}
              {d.categoryBreakdown?.length ? (
                <CategoryPie data={d.categoryBreakdown} />
              ) : (
                <EmptyState icon={FiInbox} title="No expenses this month" description="Add an expense or scan a receipt to see the breakdown." />
              )}
            </Card>
          </div>

          <Card aria-labelledby="trend-title">
            <h2 id="trend-title" className="mb-4 font-semibold">Monthly spending</h2>
            <TrendLine
              data={(d.monthlySpending || []).map((m) => ({ label: MONTHS[m.month - 1]?.slice(0, 3) ?? m.month, total: m.total }))}
              lines={[{ key: 'total', name: 'Spending', color: CHART_COLORS.expense }]}
              ariaLabel="Line chart of spending for each month of the year"
            />
          </Card>

          <Card aria-labelledby="recent-title">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="recent-title" className="font-semibold">Recent transactions</h2>
              <Link to="/expenses" className="text-sm font-medium text-brand-700 underline">View all expenses</Link>
            </div>
            {d.recentTransactions?.length ? (
              <ul className="divide-y divide-line">
                {d.recentTransactions.map((t) => (
                  <li key={t._id} className="flex items-center justify-between gap-4 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{t.description}</p>
                      <p className="text-xs text-muted">{t.category}, {formatDate(t.date)}</p>
                    </div>
                    <p className={`shrink-0 font-medium tabular-nums ${t.type === 'income' ? 'text-income' : 'text-expense'}`}>
                      {t.type === 'income' ? '+' : '−'}{formatCurrency(t.amount)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={FiInbox} title="No transactions yet" description="Your latest income and expenses will appear here." />
            )}
          </Card>
        </div>
      )}
    </>
  );
}
