import { useEffect, useReducer, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiAlertTriangle, FiEdit2 } from 'react-icons/fi';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Input, Select, Textarea } from '../components/ui/Field';
import PageHeader from '../components/ui/PageHeader';
import ProgressBar from '../components/ui/ProgressBar';
import ConfidenceBadge from '../components/receipts/ConfidenceBadge';
import Dropzone from '../components/receipts/Dropzone';
import { useToast } from '../hooks/useToast';
import { errorMessage } from '../services/api';
import { confirmReceipt, scanReceipt } from '../services/receipts';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../utils/constants';
import { toInputDate } from '../utils/format';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

const initial = { status: 'idle', preview: null, progress: 0, result: null, form: null, editing: false, error: null };

// idle -> scanning -> review -> saving -> (navigate away). `error` returns to review if a scan exists, else to the dropzone.
function reducer(s, a) {
  switch (a.type) {
    case 'start': return { ...initial, status: 'scanning', preview: a.preview };
    case 'progress': return { ...s, progress: a.value };
    case 'scanned': return { ...s, status: 'review', result: a.result, form: a.form, editing: a.editing };
    case 'field': return { ...s, form: { ...s.form, [a.name]: a.value } };
    case 'edit': return { ...s, editing: true };
    case 'saving': return { ...s, status: 'saving', error: null };
    case 'error': return { ...s, status: s.result ? 'review' : 'error', error: a.message };
    case 'reset': return initial;
    default: return s;
  }
}

export default function ScanReceipt() {
  const [state, dispatch] = useReducer(reducer, initial);
  const [errors, setErrors] = useState({});
  const toast = useToast();
  const navigate = useNavigate();
  const { status, preview, progress, result, form, editing, error } = state;

  // Release the object URL when the preview changes or the page unmounts.
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const onFile = async (file) => {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) return dispatch({ type: 'error', message: 'That file type is not supported. Use a JPG, PNG or WebP image.' });
    if (file.size > MAX_BYTES) return dispatch({ type: 'error', message: 'That image is over 5 MB. Upload a smaller photo.' });

    setErrors({});
    dispatch({ type: 'start', preview: URL.createObjectURL(file) });
    try {
      const res = await scanReceipt(file, (value) => dispatch({ type: 'progress', value }));
      const f = res.fields || {};
      // Only use what the scan found. Missing values stay blank for the user to fill in.
      const next = {
        category: f.category || '',
        description: f.description || f.merchant || '',
        amount: f.amount ?? '',
        date: f.date ? toInputDate(f.date) : '',
        paymentMethod: '',
        notes: '',
      };
      dispatch({ type: 'scanned', result: res, form: next, editing: !next.amount || !next.date || !next.category });
    } catch (e) {
      dispatch({ type: 'error', message: errorMessage(e) || 'We could not read that receipt. Try a clearer, well-lit photo.' });
    }
  };

  const confirm = async () => {
    const errs = {};
    if (!form.category) errs.category = 'Choose a category.';
    if (!form.description.trim()) errs.description = 'Add a short description.';
    if (!(Number(form.amount) > 0)) errs.amount = 'Enter the total amount.';
    if (!form.date) errs.date = 'Choose the receipt date.';
    setErrors(errs);
    if (Object.keys(errs).length) {
      dispatch({ type: 'edit' });
      return;
    }
    dispatch({ type: 'saving' });
    try {
      await confirmReceipt({
        ...form,
        description: form.description.trim(),
        amount: Number(form.amount),
        type: 'expense',
        source: 'receipt',
        receiptImage: result.receiptImage,
        receiptHash: result.receiptHash,
      });
      toast.success('Expense saved from receipt.');
      navigate('/expenses');
    } catch (e) {
      dispatch({ type: 'error', message: errorMessage(e) });
    }
  };

  const setField = (name) => (e) => dispatch({ type: 'field', name, value: e.target.value });
  const c = result?.confidence || {};
  const f = result?.fields || {};
  const busy = status === 'saving';

  return (
    <>
      <PageHeader title="Scan receipt" description="Upload a bill and we will read it. Nothing is saved until you confirm." />

      {(status === 'idle' || status === 'error') && <Dropzone onFile={onFile} error={status === 'error' ? error : null} />}

      {status === 'scanning' && (
        <Card className="mx-auto max-w-xl text-center">
          {preview && <img src={preview} alt="Receipt you uploaded" className="mx-auto mb-5 max-h-64 rounded-lg object-contain" />}
          <p className="font-medium" role="status">
            {progress < 100 ? `Uploading receipt, ${progress}%` : 'Reading text from your receipt'}
          </p>
          <div className="mt-3">
            <ProgressBar value={progress < 100 ? progress : 100} label="Receipt scan progress" />
          </div>
          {progress >= 100 && <p className="mt-2 text-sm text-muted">This can take a few seconds.</p>}
        </Card>
      )}

      {(status === 'review' || status === 'saving') && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <Card>
              <h2 className="mb-3 font-semibold">Your receipt</h2>
              {preview && <img src={preview} alt="Uploaded receipt" className="max-h-[28rem] w-full rounded-lg bg-paper object-contain" />}
            </Card>
            <Card>
              <details>
                <summary className="cursor-pointer font-semibold">Text we read from the image</summary>
                <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-paper p-3 text-xs">{result?.extractedText || 'No text was returned.'}</pre>
                {f.items?.length > 0 && (
                  <ul className="mt-3 list-disc pl-5 text-sm text-muted">
                    {f.items.map((it, i) => <li key={i}>{typeof it === 'string' ? it : `${it.name}${it.price ? `, ${it.price}` : ''}`}</li>)}
                  </ul>
                )}
              </details>
            </Card>
          </div>

          <Card>
            <h2 className="mb-1 font-semibold">Check the details</h2>
            <p className="mb-4 text-sm text-muted">Review what we found, fix anything that looks wrong, then confirm.</p>

            {result?.duplicate?.isDuplicate && (
              <p role="alert" className="mb-4 flex items-start gap-2 rounded-lg bg-amber-100 p-3 text-sm font-medium text-amber-900">
                <FiAlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {result.duplicate.message || 'This receipt looks like one you already saved.'}
              </p>
            )}
            {error && <p role="alert" className="mb-4 rounded-lg bg-expense/10 p-3 text-sm font-medium text-expense">{error}</p>}

            <div className="space-y-4">
              <Select
                label="Category"
                required
                placeholder="Select a category"
                options={EXPENSE_CATEGORIES}
                value={form.category}
                onChange={setField('category')}
                disabled={!editing || busy}
                error={errors.category}
                hint={<ConfidenceBadge value={c.category} missing={!f.category} />}
              />
              <Input
                label="Description"
                required
                value={form.description}
                onChange={setField('description')}
                disabled={!editing || busy}
                error={errors.description}
                hint={<ConfidenceBadge value={c.merchant} missing={!f.merchant && !f.description} />}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Total amount (₹)"
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={setField('amount')}
                  disabled={!editing || busy}
                  error={errors.amount}
                  hint={<ConfidenceBadge value={c.amount} missing={f.amount == null} />}
                />
                <Input
                  label="Date"
                  required
                  type="date"
                  value={form.date}
                  onChange={setField('date')}
                  disabled={!editing || busy}
                  error={errors.date}
                  hint={<ConfidenceBadge value={c.date} missing={!f.date} />}
                />
              </div>
              <Select label="Payment method" placeholder="Not specified" options={PAYMENT_METHODS} value={form.paymentMethod} onChange={setField('paymentMethod')} disabled={!editing || busy} />
              <Textarea label="Notes" value={form.notes} onChange={setField('notes')} disabled={!editing || busy} />
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button variant="ghost" onClick={() => dispatch({ type: 'reset' })} disabled={busy}>Cancel</Button>
              {!editing && (
                <Button variant="secondary" onClick={() => dispatch({ type: 'edit' })} disabled={busy}>
                  <FiEdit2 aria-hidden="true" /> Edit details
                </Button>
              )}
              <Button onClick={confirm} loading={busy}>Confirm &amp; save</Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
