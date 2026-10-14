import * as React from 'react';
import {cn} from '@/lib/utils';

export function Input({className, ...props}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[var(--brand-deep)] focus:ring-2 focus:ring-[#123b6d]/15',
        className,
      )}
      {...props}
    />
  );
}
