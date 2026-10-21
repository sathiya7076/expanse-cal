import { forwardRef } from 'react';

const variants = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-600/50',
  secondary: 'bg-white text-ink ring-1 ring-line hover:bg-paper disabled:text-muted',
  danger: 'bg-expense text-white hover:bg-expense/90 disabled:bg-expense/50',
  ghost: 'text-ink hover:bg-ink/5 disabled:text-muted',
};
const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-5 py-3 text-base',
};

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, className = '', children, type = 'button', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={loading || props.disabled}
      aria-busy={loading || undefined}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && (
        <span
          className="size-4 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
});

export default Button;
