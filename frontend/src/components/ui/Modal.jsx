import { useEffect, useId, useRef } from 'react';
import { FiX } from 'react-icons/fi';
import Button from './Button';

/** Native <dialog>: focus trap, Escape to close and inert background come for free. */
export default function Modal({ open, onClose, title, children, size = 'max-w-lg' }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby={titleId}
      className={`m-auto w-[calc(100%-2rem)] ${size} rounded-2xl bg-white p-0 text-ink shadow-xl backdrop:bg-ink/50`}
    >
      {open && (
        <div className="p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            <button onClick={onClose} aria-label="Close" className="-mr-2 -mt-2 grid size-10 place-items-center rounded-lg hover:bg-ink/5">
              <FiX className="size-5" aria-hidden="true" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', loading, onConfirm, onCancel }) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="max-w-md">
      <p className="text-sm text-muted">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
