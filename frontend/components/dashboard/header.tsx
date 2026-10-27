'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { LogOut, User, ChevronDown, Leaf, Settings } from 'lucide-react';
import { humanize } from '@/lib/format';
import AvatarDisplay from '@/components/profile/avatar-display';

const menuItem =
  'flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors duration-200';

export default function Header() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const name = session?.user?.name || 'User';
  const close = () => setIsOpen(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-mint-900/8 bg-white px-6">
      <Link href="/dashboard" className="group flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-2xl bg-mint-200 text-mint-900 transition-transform duration-300 ease-pop group-hover:-rotate-12 group-hover:scale-105">
          <Leaf size={22} />
        </div>
        <div className="hidden md:block leading-tight">
          <p className="font-display text-lg font-bold text-mint-950">MoHR</p>
          <p className="text-xs text-mint-700">Management of Human Resources</p>
        </div>
      </Link>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          className="flex items-center gap-3 rounded-full py-1.5 pl-1.5 pr-3 transition-colors duration-200 hover:bg-mint-100"
        >
          <AvatarDisplay avatar={session?.user?.image} name={name} />
          <div className="hidden sm:block text-left leading-tight">
            <p className="text-sm font-semibold text-mint-950">{name}</p>
            <p className="text-xs text-mint-700">{session?.user?.role && humanize(session.user.role)}</p>
          </div>
          <ChevronDown size={16} className={`text-mint-700 transition-transform duration-200 ease-out-soft ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            {/* Click anywhere else to close */}
            <div className="fixed inset-0" onClick={close} aria-hidden />
            <div className="absolute right-0 mt-2 w-60 origin-top-right rounded-2xl border border-mint-900/8 bg-white p-2 shadow-lift animate-pop">
              <Link href="/profile" onClick={close} className={`${menuItem} text-mint-900 hover:bg-mint-100`}>
                <User size={18} />
                My Profile
              </Link>
              {session?.user?.role === 'ADMIN' && (
                <Link href="/settings" onClick={close} className={`${menuItem} text-mint-900 hover:bg-mint-100`}>
                  <Settings size={18} />
                  Settings
                </Link>
              )}
              <hr className="my-1.5 border-mint-900/8" />
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/login' })}
                className={`${menuItem} text-rose-700 hover:bg-rose-50`}
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
