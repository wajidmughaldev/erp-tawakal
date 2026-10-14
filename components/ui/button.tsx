import * as React from 'react';
import {cn} from '@/lib/utils';

type ButtonVariant = 'default' | 'outline' | 'ghost' | 'danger' | 'success' | 'secondary';

const variants: Record<ButtonVariant, string> = {
  default: 'bg-[var(--brand-deep)] text-white hover:bg-[#0c2d54] border-transparent',
  outline: 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50',
  ghost: 'bg-transparent text-slate-600 border-transparent hover:bg-slate-100',
  danger: 'bg-red-600 text-white hover:bg-red-700 border-transparent',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 border-transparent',
  secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200',
};

export function Button({
  className,
  variant = 'default',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {variant?: ButtonVariant}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
