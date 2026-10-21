import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiEdit2, FiInbox, FiPlus, FiSearch, FiTrash2 } from 'react-icons/fi';
import Button from '../ui/Button';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import ErrorMessage from '../ui/ErrorMessage';
import { Input, Select } from '../ui/Field';
import Modal, { ConfirmDialog } from '../ui/Modal';
import PageHeader from '../ui/PageHeader';
import Spinner from '../ui/Spinner';
import TransactionForm from './TransactionForm';
import useDebounce from '../../hooks/useDebounce';
import useFetch from '../../hooks/useFetch';
import { useToast } from '../../hooks/useToast';
import { errorMessage } from '../../services/api';
import { transactionsApi } from '../../services/resources';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, SALARY_CATEGORY } from '../../utils/constants';
import { formatCurrency, formatDate } from '../../utils/format';

const SORTS = [
  { value: 'date_desc', label: 'Newest first' },
  { value: 'date_asc', label: 'Oldest first' },
  { value: 'amount_desc', label: 'Highest amount' },
  { value: 'amount_asc', label: 'Lowest amount' },
];

export default function TransactionsPage({ type }) {
  const isIncome = type === 'income';
  const formCategories = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const filterCategories = isIncome ? [SALARY_CATEGORY, ...INCOME_CATEGORIES] : EXPENSE_CATEGORIES;
  const toast = useToast();

  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const sortKey = params.get('sort') ?? 'date_desc';

  const setParam = (key, value) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true }
    );

  const [search, setSearch] = useState(q);
  const debounced = useDebounce(search);
  useEffect(() => {
    setParam('q', debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const [sort, order] = sortKey.split('_');
  const { data, loading, error, refetch } = useFetch(
    () => transactionsApi.list({ type, q: q || undefined, category: category || undefined, from: from || undefined, to: to || undefined, sort, order }),
    [type, q, category, from, to, sortKey]
  );

  const [editing, setEditing] = useState(null); // null | 'new' | transaction
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const rows = Array.isArray(data) ? data : [];
  const total = rows.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const noun = isIncome ? 'income' : 'expense';

  const save = async (body) => {
    try {
      if (editing === 'new') await transactionsApi.create(body);
      else await transactionsApi.update(editing._id, body);
      toast.success(editing === 'new' ? `Added ${noun}.` : 'Changes saved.');
      setEditing(null);
      refetch();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await transactionsApi.remove(toDelete._id);
      toast.success('Deleted.');
      setToDelete(null);
      refetch();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  const hasFilters = q || category || from || to;

  return (
    <>
      <PageHeader
        title={isIncome ? 'Income' : 'Expenses'}
        description={isIncome ? 'Freelancing, business, investments and other money coming in.' : 'Everything you have spent, searchable and filterable.'}
        actions={<Button onClick={() => setEditing('new')}><FiPlus aria-hidden="true" /> Add {noun}</Button>}
      />

      <Card className="mb-4">
        <form role="search" onSubmit={(e) => e.preventDefault()} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Input label="Search" type="search" placeholder="Description or notes" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            <FiSearch className="pointer-events-none absolute bottom-3 left-3 size-4 text-muted" aria-hidden="true" />
          </div>
          <Select label="Category" placeholder="All categories" options={filterCategories} value={category} onChange={(e) => setParam('category', e.target.value)} />
          <Input label="From" type="date" value={from} onChange={(e) => setParam('from', e.target.value)} />
          <Input label="To" type="date" value={to} onChange={(e) => setParam('to', e.target.value)} />
          <Select label="Sort by" options={SORTS} value={sortKey} onChange={(e) => setParam('sort', e.target.value)} />
        </form>
      </Card>

      {loading ? (
        <Spinner label={`Loading ${noun}`} />
      ) : error ? (
        <ErrorMessage message={error} onRetry={refetch} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={FiInbox}
          title={hasFilters ? 'Nothing matches those filters' : `No ${noun} yet`}
          description={hasFilters ? 'Clear a filter or widen the date range.' : `Add your first ${noun} to see it here.`}
          action={!hasFilters && <Button onClick={() => setEditing('new')}>Add {noun}</Button>}
        />
      ) : (
        <Card className="overflow-hidden p-0 sm:p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{isIncome ? 'Income' : 'Expense'} transactions</caption>
              <thead className="border-b border-line bg-paper text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Date</th>
                  <th scope="col" className="px-4 py-3 font-medium">Description</th>
                  <th scope="col" className="hidden px-4 py-3 font-medium sm:table-cell">Category</th>
                  <th scope="col" className="hidden px-4 py-3 font-medium lg:table-cell">Method</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Amount</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((t) => (
                  <tr key={t._id}>
                    <td className="whitespace-nowrap px-4 py-3">{formatDate(t.date)}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{t.description}</span>
                      {t.source === 'receipt' && <span className="ml-2 rounded bg-brand-50 px-1.5 py-0.5 text-xs text-brand-700">Scanned</span>}
                      <span className="block text-xs text-muted sm:hidden">{t.category}</span>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">{t.category}</td>
                    <td className="hidden px-4 py-3 text-muted lg:table-cell">{t.paymentMethod || 'Not specified'}</td>
                    <td className={`whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums ${isIncome ? 'text-income' : 'text-expense'}`}>
                      {isIncome ? '+' : '−'}{formatCurrency(t.amount)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-right">
                      <button onClick={() => setEditing(t)} aria-label={`Edit ${t.description}`} className="inline-grid size-10 place-items-center rounded-lg hover:bg-ink/5">
                        <FiEdit2 className="size-4" aria-hidden="true" />
                      </button>
                      <button onClick={() => setToDelete(t)} aria-label={`Delete ${t.description}`} className="inline-grid size-10 place-items-center rounded-lg text-expense hover:bg-expense/10">
                        <FiTrash2 className="size-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-line bg-paper">
                <tr>
                  <th scope="row" colSpan={4} className="px-4 py-3 text-left font-medium text-muted">
                    {rows.length} {rows.length === 1 ? 'transaction' : 'transactions'}
                  </th>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatCurrency(total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === 'new' ? `Add ${noun}` : `Edit ${noun}`}>
        {editing && (
          <TransactionForm
            type={type}
            categories={formCategories}
            initial={editing === 'new' ? null : editing}
            onSubmit={save}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title={`Delete this ${noun}?`}
        message={toDelete ? `"${toDelete.description}" for ${formatCurrency(toDelete.amount)} will be removed permanently.` : ''}
        loading={deleting}
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
