import { useState } from 'react';
import Button from '../ui/Button';
import { Input, Select, Textarea } from '../ui/Field';
import { PAYMENT_METHODS } from '../../utils/constants';
import { toInputDate, today } from '../../utils/format';

export default function TransactionForm({ type, categories, initial, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    category: initial?.category ?? '',
    description: initial?.description ?? '',
    amount: initial?.amount ?? '',
    date: initial?.date ? toInputDate(initial.date) : today(),
    paymentMethod: initial?.paymentMethod ?? '',
    notes: initial?.notes ?? '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Keep a category that is no longer in the list (e.g. "Salary") selectable when editing.
  const options = !initial?.category || categories.includes(initial.category) ? categories : [initial.category, ...categories];

  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.category) e.category = 'Choose a category.';
    if (!form.description.trim()) e.description = 'Add a short description.';
    if (!(Number(form.amount) > 0)) e.amount = 'Enter an amount greater than 0.';
    if (!form.date) e.date = 'Choose a date.';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await onSubmit({ ...form, type, amount: Number(form.amount), description: form.description.trim() });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Category" required placeholder="Select a category" options={options} value={form.category} onChange={set('category')} error={errors.category} />
        <Input label="Amount (₹)" required type="number" inputMode="decimal" min="0" step="0.01" value={form.amount} onChange={set('amount')} error={errors.amount} />
      </div>
      <Input label="Description" required value={form.description} onChange={set('description')} error={errors.description} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Date" required type="date" value={form.date} onChange={set('date')} error={errors.date} />
        <Select label="Payment method" placeholder="Not specified" options={PAYMENT_METHODS} value={form.paymentMethod} onChange={set('paymentMethod')} />
      </div>
      <Textarea label="Notes" value={form.notes} onChange={set('notes')} />
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={saving}>{initial ? 'Save changes' : `Add ${type}`}</Button>
      </div>
    </form>
  );
}
