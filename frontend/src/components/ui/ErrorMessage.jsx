import Button from './Button';

export default function ErrorMessage({ message, onRetry }) {
  return (
    <div role="alert" className="rounded-xl border border-expense/30 bg-expense/5 p-4 text-sm text-expense">
      <p className="font-medium">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
