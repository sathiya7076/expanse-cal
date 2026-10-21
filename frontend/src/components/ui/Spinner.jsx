export default function Spinner({ label = 'Loading', className = 'py-16' }) {
  return (
    <div role="status" className={`flex items-center justify-center gap-3 text-muted ${className}`}>
      <span className="size-5 rounded-full border-2 border-brand-600 border-t-transparent motion-safe:animate-spin" aria-hidden="true" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
