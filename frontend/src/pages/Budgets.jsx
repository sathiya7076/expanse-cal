import { useState } from 'react';
import { FiAlertTriangle, FiEdit2, FiPieChart, FiPlus, FiTrash2 } from 'react-icons/fi';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import ErrorMessage from '../components/ui/ErrorMessage';
import { Input, Select } from '../components/ui/Field';
import Modal, { ConfirmDialog } from '../components/ui/Modal';
import PageHeader from '../components/ui/PageHeader';
import PeriodFilter from '../components/ui/PeriodFilter';
import ProgressBar from '../components/ui/ProgressBar';
import Spinner from '../components/ui/Spinner';
import useFetch from '../hooks/useFetch';
import { useToast } from '../hooks/useToast';
import { errorMessage } from '../services/api';
import { budgetsApi } from '../services/resources';
import { EXPENSE_CATEGORIES, MONTHS } from '../utils/constants';
import { formatCurrency } from '../utils/format';

function BudgetForm({ initial, month, year, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    category: initial?.category ?? '',
    amount: initial?.amount ?? '',
    month: initial?.month ?? month,
    year: initial?.year ?? year,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (n) => (e) => setForm((f) => ({ ...f, [n]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.category) errs.category = 'Choose a category.';
    if (!(Number(form.amount) > 0)) errs.amount = 'Enter a budget greater than 0.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      await onSubmit({ category: form.category, amount: Number(form.amount), month: Number(form.month), year: Number(form.year) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Select label="Category" required placeholder="Select a category" options={EXPENSE_CATEGORIES} value={form.category} onChange={set('category')} error={errors.category} />
      <Input label="Budget amount (₹)" required type="number" min="0" step="0.01" inputMode="decimal" value={form.amount} onChange={set('amount')} error={errors.amount} />
      <div className="grid grid-cols-2 gap-4">
        <Select label="Month" options={MONTHS.map((m, i) => ({ value: i + 1, label: m }))} value={form.month} onChange={set('month')} />
        <Input label="Year" type="number" min="2000" max="2100" value={form.year} onChange={set('year')} />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={saving}>{initial ? 'Save changes' : 'Create budget'}</Button>
      </div>
    </form>
  );
}

export default function Budgets() {
  const now = new Date();
  const toast = useToast();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const { data, loading, error, refetch } = useFetch(() => budgetsApi.list({ month, year }), [month, year]);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const list = Array.isArray(data) ? data : [];

  const save = async (body) => {
    try {
      if (editing === 'new') await budgetsApi.create(body);
      else await budgetsApi.update(editing._id, body);
      toast.success('Budget saved.');
      setEditing(null);
      refetch();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await budgetsApi.remove(toDelete._id);
      toast.success('Budget deleted.');
      setToDelete(null);
      refetch();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Budgets"
        description="Monthly limits per category. Spent amounts come from your expenses."
        actions={
          <>
            <PeriodFilter month={month} year={year} onMonth={setMonth} onYear={setYear} />
            <Button className="self-end" onClick={() => setEditing('new')}><FiPlus aria-hidden="true" /> New budget</Button>
          </>
        }
      />

      {loading ? (
        <Spinner label="Loading budgets" />
      ) : error ? (
        <ErrorMessage message={error} onRetry={refetch} />
      ) : list.length === 0 ? (
        <EmptyState icon={FiPieChart} title={`No budgets for ${MONTHS[month - 1]} ${year}`} description="Set a limit for a category to see how much you have left." action={<Button onClick={() => setEditing('new')}>Create a budget</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((b) => {
            const spent = Number(b.spent) || 0;
            const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
            const over = pct > 100;
            const warn = !over && pct >= 80;
            return (
              <Card key={b._id} as="article" aria-label={`${b.category} budget`}>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold">{b.category}</h2>
                  <div className="flex">
                    <button onClick={() => setEditing(b)} aria-label={`Edit ${b.category} budget`} className="grid size-10 place-items-center rounded-lg hover:bg-ink/5"><FiEdit2 className="size-4" aria-hidden="true" /></button>
                    <button onClick={() => setToDelete(b)} aria-label={`Delete ${b.category} budget`} className="grid size-10 place-items-center rounded-lg text-expense hover:bg-expense/10"><FiTrash2 className="size-4" aria-hidden="true" /></button>
                  </div>
                </div>
                <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
                  <div><dt className="text-muted">Budget</dt><dd className="font-medium tabular-nums">{formatCurrency(b.amount)}</dd></div>
                  <div><dt className="text-muted">Spent</dt><dd className="font-medium tabular-nums">{formatCurrency(spent)}</dd></div>
                  <div><dt className="text-muted">{over ? 'Over by' : 'Left'}</dt><dd className={`font-medium tabular-nums ${over ? 'text-expense' : ''}`}>{formatCurrency(Math.abs(b.amount - spent))}</dd></div>
                </dl>
                <div className="mt-3">
                  <ProgressBar value={pct} tone={over ? 'danger' : warn ? 'warn' : 'brand'} label={`${b.category} budget used`} />
                  <p className="mt-1.5 text-xs text-muted tabular-nums">{Math.round(pct)}% used</p>
                </div>
                {(warn || over) && (
                  <p role="status" className={`mt-3 flex items-start gap-2 text-sm font-medium ${over ? 'text-expense' : 'text-warn'}`}>
                    <FiAlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    {over ? `You have gone over the ${b.category} budget.` : `You have used ${Math.round(pct)}% of the ${b.category} budget.`}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === 'new' ? 'New budget' : 'Edit budget'}>
        {editing && <BudgetForm initial={editing === 'new' ? null : editing} month={month} year={year} onSubmit={save} onCancel={() => setEditing(null)} />}
      </Modal>
      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete this budget?"
        message={toDelete ? `The ${toDelete.category} budget for ${MONTHS[toDelete.month - 1]} ${toDelete.year} will be removed. Your expenses are not affected.` : ''}
        loading={deleting}
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
