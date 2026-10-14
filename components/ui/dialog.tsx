'use client';

import * as React from 'react';
import {cn} from '@/lib/utils';

export function Dialog({
  open,
  title,
  children,
  onClose,
  className,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const panel = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement;
    panel.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const controls = panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]');
        if (!controls?.length) {event.preventDefault(); return;}
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {event.preventDefault(); last.focus();}
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) {event.preventDefault(); first.focus();}
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {document.removeEventListener('keydown', keydown); previous?.focus();};
  }, [open, onClose]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
      <div ref={panel} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className={cn('max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white shadow-2xl', className)}>
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <button className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100" onClick={onClose} type="button">
            x
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
