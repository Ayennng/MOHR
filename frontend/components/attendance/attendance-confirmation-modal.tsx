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
        <div className="p-4 bg-moss-50 rounded-2xl border-2 border-moss-100 text-center">
          <p className="text-sm text-moss-600 font-semibold">Current Time</p>
          <LiveClock className="text-2xl font-bold text-moss-900" />
        </div>

        <p className="text-center text-moss-800">
          {isCheckIn
            ? 'You are about to check in for today. This will record your arrival time.'
            : 'You are about to check out. This will end your work session for today.'}
        </p>

        <button
          type="button"
          onPointerDown={hold}
          onPointerUp={release}
          onPointerLeave={release}
          className={`relative w-full py-4 rounded-2xl font-bold text-lg text-white overflow-hidden shadow-lg select-none transition-transform ${
            heldSince ? 'scale-95' : ''
          } ${isCheckIn ? 'bg-moss-600 hover:bg-moss-700' : 'bg-red-600 hover:bg-red-700'}`}
        >
          <span className="absolute inset-y-0 left-0 bg-white/30" style={{ width: `${progress}%` }} />
          <span className="relative flex items-center justify-center gap-2">
            <Icon size={24} />
            {heldSince ? `Keep holding... ${Math.ceil(progress)}%` : `Hold for 2 seconds to ${title.toLowerCase()}`}
          </span>
        </button>
      </div>
    </Modal>
  );
}
