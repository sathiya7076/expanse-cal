import { useId } from 'react';

const control =
  'block w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink placeholder:text-muted/70 disabled:bg-paper disabled:text-muted aria-[invalid=true]:border-expense';

function Field({ id, label, error, hint, required, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
        {required && <span className="text-expense" aria-hidden="true"> *</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1 text-xs font-medium text-expense">
          {error}
        </p>
      )}
    </div>
  );
}

const describe = (id, error, hint) => (error ? `${id}-err` : hint ? `${id}-hint` : undefined);

export function Input({ label, error, hint, className = '', ...props }) {
  const id = useId();
  return (
    <Field id={id} label={label} error={error} hint={hint} required={props.required}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describe(id, error, hint)}
        className={`${control} ${className}`}
        {...props}
      />
    </Field>
  );
}

export function Select({ label, error, hint, options, placeholder, className = '', ...props }) {
  const id = useId();
  return (
    <Field id={id} label={label} error={error} hint={hint} required={props.required}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describe(id, error, hint)}
        className={`${control} ${className}`}
        {...props}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const value = typeof o === 'string' ? o : o.value;
          const text = typeof o === 'string' ? o : o.label;
          return (
            <option key={value} value={value}>
              {text}
            </option>
          );
        })}
      </select>
    </Field>
  );
}

export function Textarea({ label, error, hint, className = '', ...props }) {
  const id = useId();
  return (
    <Field id={id} label={label} error={error} hint={hint} required={props.required}>
      <textarea
        id={id}
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={describe(id, error, hint)}
        className={`${control} ${className}`}
        {...props}
      />
    </Field>
  );
}
