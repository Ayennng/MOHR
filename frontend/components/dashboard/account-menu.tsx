'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { LogOut, User, ChevronsUpDown, Settings } from 'lucide-react';
import { humanize } from '@/lib/format';
import AvatarDisplay from '@/components/profile/avatar-display';

const menuItem =
  'flex w-full items-center gap-2.5 rounded-lg px-2.5 h-9 text-sm transition-colors duration-150';

/** The signed-in user at the foot of the sidebar; opens a menu upwards. */
export function AccountMenu({ expanded }: { expanded: boolean }) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const name = session?.user?.name || 'User';
  const close = () => setIsOpen(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="Account"
        className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors duration-150 hover:bg-ink-100 ${
          expanded ? '' : 'justify-center'
        }`}
      >
        <AvatarDisplay avatar={session?.user?.image} name={name} />
        {expanded && (
          <>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-sm font-medium text-ink-900">{name}</span>
              <span className="block truncate text-xs text-ink-500">
                {session?.user?.role ? humanize(session.user.role) : ' '}
              </span>
            </span>
            <ChevronsUpDown size={16} className="shrink-0 text-ink-400" />
          </>
        )}
      </button>

      {isOpen && (
        <>
          {/* Click anywhere else to close */}
          <div className="fixed inset-0 z-40" onClick={close} aria-hidden />
          <div className="absolute bottom-full left-0 z-50 mb-2 w-56 origin-bottom-left rounded-xl border border-ink-900/8 bg-white p-1.5 shadow-lift animate-pop">
            <Link href="/profile" onClick={close} className={`${menuItem} text-ink-800 hover:bg-ink-100`}>
              <User size={16} className="text-ink-500" />
              Profile
            </Link>
            {session?.user?.role === 'ADMIN' && (
              <Link href="/settings" onClick={close} className={`${menuItem} text-ink-800 hover:bg-ink-100`}>
                <Settings size={16} className="text-ink-500" />
                Settings
              </Link>
            )}
            <hr className="my-1.5 border-ink-900/8" />
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className={`${menuItem} text-rose-700 hover:bg-rose-50`}
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
