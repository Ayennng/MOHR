'use client';

import { useEffect, useRef, useState } from 'react';
import { LogIn, LogOut } from 'lucide-react';
import { Modal } from '@/components/ui';
import { LiveClock } from './live-clock';

const HOLD_MS = 2000;

/** Check-in/out confirmation: the button has to be held for two seconds, so it can't be clicked by accident. */
export default function AttendanceConfirmationModal({
  type,
  onClose,
  onConfirm,
}: {
  /** The action to confirm, or null when closed. */
  type: 'checkin' | 'checkout' | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [heldSince, setHeldSince] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const release = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setHeldSince(null);
    setProgress(0);
  };

  const hold = () => {
    const start = Date.now();
    setHeldSince(start);
    timer.current = setInterval(() => {
      const done = Math.min((Date.now() - start) / HOLD_MS, 1);
      setProgress(done * 100);
      if (done === 1) {
        release();
        onConfirm();
      }
    }, 20);
  };

  // Stop the timer if the modal closes (or unmounts) mid-hold
  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, [type]);

  if (!type) return null;

  const isCheckIn = type === 'checkin';
  const title = isCheckIn ? 'Check In' : 'Check Out';
  const Icon = isCheckIn ? LogIn : LogOut;

  return (
    <Modal isOpen onClose={() => (release(), onClose())} title={`${title} Confirmation`}>
      <div className="space-y-6">
        <div className="rounded-2xl bg-mint-100 p-4 text-center">
          <p className="text-sm text-mint-700 font-semibold">Current Time</p>
          <LiveClock className="font-display text-3xl font-bold tabular-nums text-mint-950" />
        </div>

        <p className="text-center text-mint-800">
          {isCheckIn
            ? 'You are about to check in for today. This will record your arrival time.'
            : 'You are about to check out. This will end your work session for today.'}
        </p>

        <button
          type="button"
          onPointerDown={hold}
          onPointerUp={release}
          onPointerLeave={release}
          className={`relative w-full overflow-hidden rounded-full py-4 text-lg font-bold select-none touch-none transition-transform duration-200 ease-out-soft ${
            heldSince ? 'scale-[0.97]' : ''
          } ${isCheckIn ? 'bg-mint-900 text-mint-200' : 'bg-red-600 text-white'}`}
        >
          {/* Fills left to right while held (scaleX, so no layout work per frame) */}
          <span
            aria-hidden
            className={`absolute inset-0 origin-left ${isCheckIn ? 'bg-mint-200/25' : 'bg-white/25'}`}
            style={{ transform: `scaleX(${progress / 100})` }}
          />
          <span className="relative flex items-center justify-center gap-2">
            <Icon size={24} />
            {heldSince ? `Keep holding... ${Math.ceil(progress)}%` : `Hold for 2 seconds to ${title.toLowerCase()}`}
          </span>
        </button>
      </div>
    </Modal>
  );
}
