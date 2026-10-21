import { useState } from 'react';
import { FiBriefcase, FiDollarSign, FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import ErrorMessage from '../components/ui/ErrorMessage';
import { Input, Select, Textarea } from '../components/ui/Field';
import Modal, { ConfirmDialog } from '../components/ui/Modal';
import PageHeader from '../components/ui/PageHeader';
import Spinner from '../components/ui/Spinner';
import useFetch from '../hooks/useFetch';
import { useToast } from '../hooks/useToast';
import { errorMessage } from '../services/api';
import { salaryApi, transactionsApi } from '../services/resources';
import { FREQUENCIES, SALARY_CATEGORY } from '../utils/constants';
import { formatCurrency, formatDate, toInputDate, today } from '../utils/format';

function SalaryForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    employeeName: initial?.employeeName ?? '',
    companyName: initial?.companyName ?? '',
    amount: initial?.amount ?? '',
    paymentFrequency: initial?.paymentFrequency ?? 'Monthly',
    paymentDate: initial?.paymentDate ? toInputDate(initial.paymentDate) : today(),
    notes: initial?.notes ?? '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (n) => (e) => setForm((f) => ({ ...f, [n]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.employeeName.trim()) errs.employeeName = 'Enter the employee name.';
    if (!form.companyName.trim()) errs.companyName = 'Enter the company name.';
    if (!(Number(form.amount) > 0)) errs.amount = 'Enter a salary greater than 0.';
    if (!form.paymentDate) errs.paymentDate = 'Choose a payment date.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      await onSubmit({ ...form, amount: Number(form.amount) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Employee name" required value={form.employeeName} onChange={set('employeeName')} error={errors.employeeName} />
        <Input label="Company name" required value={form.companyName} onChange={set('companyName')} error={errors.companyName} />
        <Input label="Salary (₹)" required type="number" min="0" step="0.01" inputMode="decimal" value={form.amount} onChange={set('amount')} error={errors.amount} />
        <Select label="Payment frequency" options={FREQUENCIES} value={form.paymentFrequency} onChange={set('paymentFrequency')} />
        <Input label="Salary payment date" required type="date" value={form.paymentDate} onChange={set('paymentDate')} error={errors.paymentDate} />
      </div>
      <Textarea label="Notes" value={form.notes} onChange={set('notes')} />
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={saving}>{initial ? 'Save changes' : 'Add salary'}</Button>
      </div>
    </form>
  );
}

export default function Salary() {
  const toast = useToast();
  const salaries = useFetch(() => salaryApi.list(), []);
  const history = useFetch(() => transactionsApi.list({ type: 'income', category: SALARY_CATEGORY, sort: 'date', order: 'desc' }), []);

  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [paying, setPaying] = useState(null);

  const list = Array.isArray(salaries.data) ? salaries.data : [];
  const payments = Array.isArray(history.data) ? history.data : [];

  const save = async (body) => {
    try {
      if (editing === 'new') await salaryApi.create(body);
      else await salaryApi.update(editing._id, body);
      toast.success('Salary details saved.');
      setEditing(null);
      salaries.refetch();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await salaryApi.remove(toDelete._id);
      toast.success('Salary details deleted.');
      setToDelete(null);
      salaries.refetch();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  // Recording a payment creates an income transaction. The backend rejects duplicates for the same period.
  const recordPayment = async (s) => {
    setPaying(s._id);
    try {
      await transactionsApi.create({
        type: 'income',
        category: SALARY_CATEGORY,
        description: `Salary from ${s.companyName}`,
        amount: s.amount,
        date: today(),
        notes: s.notes || '',
        salaryId: s._id,
      });
      toast.success('Salary payment recorded.');
      history.refetch();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setPaying(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Salary"
        description="Keep your salary details here and record each payment as income."
        actions={<Button onClick={() => setEditing('new')}><FiPlus aria-hidden="true" /> Add salary details</Button>}
      />

      {salaries.loading ? (
        <Spinner label="Loading salary details" />
      ) : salaries.error ? (
        <ErrorMessage message={salaries.error} onRetry={salaries.refetch} />
      ) : list.length === 0 ? (
        <EmptyState icon={FiBriefcase} title="No salary details yet" description="Add your employer and monthly salary to start recording payments." action={<Button onClick={() => setEditing('new')}>Add salary details</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((s) => (
            <Card key={s._id} as="article" aria-label={`${s.companyName} salary`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{s.companyName}</h2>
                  <p className="text-sm text-muted">{s.employeeName}</p>
                </div>
                <div className="flex">
                  <button onClick={() => setEditing(s)} aria-label={`Edit salary at ${s.companyName}`} className="grid size-10 place-items-center rounded-lg hover:bg-ink/5"><FiEdit2 className="size-4" aria-hidden="true" /></button>
                  <button onClick={() => setToDelete(s)} aria-label={`Delete salary at ${s.companyName}`} className="grid size-10 place-items-center rounded-lg text-expense hover:bg-expense/10"><FiTrash2 className="size-4" aria-hidden="true" /></button>
                </div>
              </div>
              <p className="mt-3 text-2xl font-semibold tabular-nums">{formatCurrency(s.amount)}</p>
              <p className="text-sm text-muted">{s.paymentFrequency}, paid around {formatDate(s.paymentDate)}</p>
              {s.notes && <p className="mt-2 text-sm text-muted">{s.notes}</p>}
              <Button className="mt-4" size="sm" loading={paying === s._id} onClick={() => recordPayment(s)}>
                <FiDollarSign aria-hidden="true" /> Record payment
              </Button>
            </Card>
          ))}
        </div>
      )}

      <h2 className="mb-3 mt-10 text-lg font-semibold">Salary history</h2>
      {history.loading ? (
        <Spinner label="Loading history" className="py-8" />
      ) : payments.length === 0 ? (
        <p className="text-sm text-muted">No salary payments recorded yet.</p>
      ) : (
        <Card className="overflow-x-auto p-0 sm:p-0">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Recorded salary payments</caption>
            <thead className="border-b border-line bg-paper text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Date</th>
                <th scope="col" className="px-4 py-3 font-medium">Description</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {payments.map((p) => (
                <tr key={p._id}>
                  <td className="whitespace-nowrap px-4 py-3">{formatDate(p.date)}</td>
                  <td className="px-4 py-3">{p.description}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-income">+{formatCurrency(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add salary details' : 'Edit salary details'}>
        {editing && <SalaryForm initial={editing === 'new' ? null : editing} onSubmit={save} onCancel={() => setEditing(null)} />}
      </Modal>
      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete salary details?"
        message={toDelete ? `Details for ${toDelete.companyName} will be removed. Payments you already recorded stay in your history.` : ''}
        loading={deleting}
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
