'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const EXIT_MS = 160;

/**
 * Dialog over a dimmed page. Closes on the backdrop, the X button or Escape. It
 * stays mounted for a short exit (fade and sink) after `isOpen` turns false.
 */
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
  // What is on screen trails `isOpen` by the exit animation
  const [shown, setShown] = useState(isOpen);
  // The last content, so the panel doesn't empty out while it leaves
  const [lastChildren, setLastChildren] = useState(children);
  if (isOpen && !shown) setShown(true);
  if (isOpen && lastChildren !== children) setLastChildren(children);

  useEffect(() => {
    if (isOpen || !shown) return;
    const timeout = setTimeout(() => setShown(false), EXIT_MS);
    return () => clearTimeout(timeout);
  }, [isOpen, shown]);

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

  if (!shown) return null;
  const leaving = !isOpen;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`absolute inset-0 bg-mint-950/40 backdrop-blur-[2px] transition-opacity duration-150 ${leaving ? 'opacity-0' : 'animate-fade'}`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-card bg-white shadow-lift transition-[opacity,transform] duration-150 ${
          leaving ? 'opacity-0 translate-y-2 scale-[0.98]' : 'animate-pop'
        }`}
      >
        <div className="flex items-start justify-between px-6 pt-6 pb-4">
          <h2 className="text-xl font-bold text-mint-950">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-1 grid size-9 place-items-center rounded-full text-mint-800 transition-[background-color,transform] duration-200 ease-out-soft hover:bg-mint-100 hover:rotate-90"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-6 pb-6">{isOpen ? children : lastChildren}</div>
      </div>
    </div>
  );
}

/** Right-aligned row of buttons at the bottom of a modal. */
export function ModalActions({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-end gap-3 mt-6">{children}</div>;
}
