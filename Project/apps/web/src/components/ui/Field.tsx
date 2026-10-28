import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/labels';

interface WrapProps {
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  children: (id: string, describedBy?: string) => ReactNode;
}

export function FieldWrap({ label, error, hint, required, className, children }: WrapProps) {
  const id = useId();
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {required && <span className="ml-0.5 text-red-600" aria-hidden>*</span>}
      </label>
      {children(id, describedBy)}
      {error ? (
        <p id={`${id}-err`} className="mt-1 text-xs text-red-600" role="alert">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

type Common = { label: ReactNode; error?: string; hint?: ReactNode; wrapClassName?: string };

export function Input({ label, error, hint, wrapClassName, className, required, ...rest }: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldWrap label={label} error={error} hint={hint} required={required} className={wrapClassName}>
      {(id, d) => <input id={id} aria-invalid={!!error || undefined} aria-describedby={d} required={required} className={cn('field', className)} {...rest} />}
    </FieldWrap>
  );
}

export function Select({ label, error, hint, wrapClassName, className, required, children, ...rest }: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldWrap label={label} error={error} hint={hint} required={required} className={wrapClassName}>
      {(id, d) => (
        <select id={id} aria-invalid={!!error || undefined} aria-describedby={d} required={required} className={cn('field pr-8', className)} {...rest}>
          {children}
        </select>
      )}
    </FieldWrap>
  );
}

export function Textarea({ label, error, hint, wrapClassName, className, required, ...rest }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldWrap label={label} error={error} hint={hint} required={required} className={wrapClassName}>
      {(id, d) => <textarea id={id} aria-invalid={!!error || undefined} aria-describedby={d} required={required} rows={4} className={cn('field', className)} {...rest} />}
    </FieldWrap>
  );
}

export function Checkbox({ label, error, className, ...rest }: { label: ReactNode; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-2 text-sm text-ink">
        <input id={id} type="checkbox" className="mt-0.5 h-4 w-4 rounded border-line accent-brand-600" aria-invalid={!!error || undefined} {...rest} />
        <span>{label}</span>
      </label>
      {error && <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>}
    </div>
  );
}
