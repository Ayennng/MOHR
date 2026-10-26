'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/** Dialog over a dimmed page. Closes on the backdrop, the X button or Escape. */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label={title} className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between p-6 border-b border-moss-100">
          <h2 className="text-xl font-bold text-moss-900">{title}</h2>
          <button type="button" onClick={onClose} className="text-moss-500 hover:text-moss-700 ml-4" aria-label="Close">
            <X size={24} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

/** Right-aligned row of buttons at the bottom of a modal. */
export function ModalActions({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-end gap-3 mt-6">{children}</div>;
}
