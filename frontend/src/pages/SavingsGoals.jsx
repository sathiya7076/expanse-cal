import { useState } from 'react';
import { FiCheckCircle, FiEdit2, FiPlus, FiTarget, FiTrash2 } from 'react-icons/fi';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import ErrorMessage from '../components/ui/ErrorMessage';
import { Input } from '../components/ui/Field';
import Modal, { ConfirmDialog } from '../components/ui/Modal';
import PageHeader from '../components/ui/PageHeader';
import ProgressBar from '../components/ui/ProgressBar';
import Spinner from '../components/ui/Spinner';
import useFetch from '../hooks/useFetch';
import { useToast } from '../hooks/useToast';
import { errorMessage } from '../services/api';
import { goalsApi } from '../services/resources';
import { formatCurrency, formatDate, toInputDate } from '../utils/format';

function GoalForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    targetAmount: initial?.targetAmount ?? '',
    currentAmount: initial?.currentAmount ?? 0,
    targetDate: initial?.targetDate ? toInputDate(initial.targetDate) : '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (n) => (e) => setForm((f) => ({ ...f, [n]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name your goal.';
    if (!(Number(form.targetAmount) > 0)) errs.targetAmount = 'Enter a target greater than 0.';
    if (Number(form.currentAmount) < 0) errs.currentAmount = 'Saved amount cannot be negative.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        targetAmount: Number(form.targetAmount),
        currentAmount: Number(form.currentAmount) || 0,
        targetDate: form.targetDate || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Input label="Goal name" required value={form.name} onChange={set('name')} error={errors.name} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Target amount (₹)" required type="number" min="0" step="0.01" inputMode="decimal" value={form.targetAmount} onChange={set('targetAmount')} error={errors.targetAmount} />
        <Input label="Saved so far (₹)" type="number" min="0" step="0.01" inputMode="decimal" value={form.currentAmount} onChange={set('currentAmount')} error={errors.currentAmount} />
      </div>
      <Input label="Target date" type="date" value={form.targetDate} onChange={set('targetDate')} />
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={saving}>{initial ? 'Save changes' : 'Create goal'}</Button>
      </div>
    </form>
  );
}

function AddProgressForm({ goal, onSubmit, onCancel }) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!(Number(amount) > 0)) return setError('Enter an amount greater than 0.');
    setSaving(true);
    try {
      await onSubmit(Number(amount));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <p className="text-sm text-muted">
        {formatCurrency(goal.currentAmount)} saved of {formatCurrency(goal.targetAmount)}.
      </p>
      <Input label="Amount to add (₹)" required type="number" min="0" step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} error={error} />
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={saving}>Add to savings</Button>
      </div>
    </form>
  );
}

export default function SavingsGoals() {
  const toast = useToast();
  const { data, loading, error, refetch } = useFetch(() => goalsApi.list(), []);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const goals = Array.isArray(data) ? data : [];
  const active = goals.filter((g) => g.currentAmount < g.targetAmount);
  const done = goals.filter((g) => g.currentAmount >= g.targetAmount);

  const save = async (body) => {
    try {
      if (editing === 'new') await goalsApi.create(body);
      else await goalsApi.update(editing._id, body);
      toast.success('Goal saved.');
      setEditing(null);
      refetch();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const addProgress = async (amount) => {
    try {
      await goalsApi.update(adding._id, { currentAmount: Number(adding.currentAmount) + amount });
      toast.success('Progress updated.');
      setAdding(null);
      refetch();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await goalsApi.remove(toDelete._id);
      toast.success('Goal deleted.');
      setToDelete(null);
      refetch();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  const GoalCard = ({ g }) => {
    const pct = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;
    const complete = g.currentAmount >= g.targetAmount;
    return (
      <Card as="article" aria-label={g.name}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">{g.name}</h3>
            {g.targetDate && <p className="text-sm text-muted">Target date {formatDate(g.targetDate)}</p>}
          </div>
          <div className="flex">
            <button onClick={() => setEditing(g)} aria-label={`Edit ${g.name}`} className="grid size-10 place-items-center rounded-lg hover:bg-ink/5"><FiEdit2 className="size-4" aria-hidden="true" /></button>
            <button onClick={() => setToDelete(g)} aria-label={`Delete ${g.name}`} className="grid size-10 place-items-center rounded-lg text-expense hover:bg-expense/10"><FiTrash2 className="size-4" aria-hidden="true" /></button>
          </div>
        </div>
        <p className="mt-3 text-sm tabular-nums">
          <span className="text-xl font-semibold">{formatCurrency(g.currentAmount)}</span>
          <span className="text-muted"> of {formatCurrency(g.targetAmount)}</span>
        </p>
        <div className="mt-2"><ProgressBar value={pct} label={`${g.name} progress`} /></div>
        <div className="mt-2 flex items-center justify-between text-sm">
          {complete ? (
            <span className="flex items-center gap-1.5 font-medium text-income"><FiCheckCircle aria-hidden="true" /> Goal reached</span>
          ) : (
            <span className="text-muted tabular-nums">{formatCurrency(g.targetAmount - g.currentAmount)} to go</span>
          )}
          {!complete && <Button size="sm" variant="secondary" onClick={() => setAdding(g)}>Add progress</Button>}
        </div>
      </Card>
    );
  };

  return (
    <>
      <PageHeader
        title="Savings goals"
        description="Money you set aside on purpose. Your remaining balance is not counted as savings."
        actions={<Button onClick={() => setEditing('new')}><FiPlus aria-hidden="true" /> New goal</Button>}
      />

      {loading ? (
        <Spinner label="Loading goals" />
      ) : error ? (
        <ErrorMessage message={error} onRetry={refetch} />
      ) : goals.length === 0 ? (
        <EmptyState icon={FiTarget} title="No savings goals yet" description="Create a goal, then add progress as you save." action={<Button onClick={() => setEditing('new')}>Create a goal</Button>} />
      ) : (
        <div className="space-y-8">
          <section aria-labelledby="active-goals">
            <h2 id="active-goals" className="mb-3 font-semibold">In progress</h2>
            {active.length ? <div className="grid gap-4 md:grid-cols-2">{active.map((g) => <GoalCard key={g._id} g={g} />)}</div> : <p className="text-sm text-muted">Every goal is complete.</p>}
          </section>
          {done.length > 0 && (
            <section aria-labelledby="done-goals">
              <h2 id="done-goals" className="mb-3 font-semibold">Completed</h2>
              <div className="grid gap-4 md:grid-cols-2">{done.map((g) => <GoalCard key={g._id} g={g} />)}</div>
            </section>
          )}
        </div>
      )}

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === 'new' ? 'New savings goal' : 'Edit goal'}>
        {editing && <GoalForm initial={editing === 'new' ? null : editing} onSubmit={save} onCancel={() => setEditing(null)} />}
      </Modal>
      <Modal open={Boolean(adding)} onClose={() => setAdding(null)} title={adding ? `Add progress to ${adding.name}` : ''} size="max-w-md">
        {adding && <AddProgressForm goal={adding} onSubmit={addProgress} onCancel={() => setAdding(null)} />}
      </Modal>
      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete this goal?"
        message={toDelete ? `"${toDelete.name}" and its progress will be removed.` : ''}
        loading={deleting}
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
