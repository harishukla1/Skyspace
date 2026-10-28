'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from './Button';

/** Accessible modal built on the native <dialog> element (focus trapping and Esc handling by the browser). */
export function Modal({ open, onClose, title, children, footer, size = 'md' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; size?: 'md' | 'lg' }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="modal-title"
      className={`m-auto w-[calc(100%-2rem)] ${size === 'lg' ? 'max-w-2xl' : 'max-w-md'} rounded-2xl p-0 shadow-[var(--shadow-lift)] backdrop:bg-ink/40 backdrop:backdrop-blur-sm`}
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 id="modal-title" className="text-lg font-semibold">{title}</h2>
        <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-surface hover:text-ink" aria-label="Close dialog">✕</button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
      {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
    </dialog>
  );
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', tone = 'primary', loading, children,
}: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; message?: ReactNode; confirmLabel?: string; tone?: 'primary' | 'danger'; loading?: boolean; children?: ReactNode;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant={tone} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      }
    >
      {message && <p className="text-sm text-muted">{message}</p>}
      {children}
    </Modal>
  );
}
