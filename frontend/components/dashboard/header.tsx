'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { LogOut, User, ChevronDown, Leaf, Settings } from 'lucide-react';
import AvatarDisplay from '@/components/profile/avatar-display';

const menuItem = 'w-full flex items-center gap-3 px-4 py-3 text-sm rounded-lg transition-colors';

export default function Header() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const name = session?.user?.name || 'User';
  const close = () => setIsOpen(false);

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-moss-200 flex items-center justify-between px-6 shadow-md z-50">
      <Link href="/dashboard" className="flex items-center gap-3">
        <div className="w-10 h-10 bg-linear-to-br from-moss-500 to-moss-600 rounded-xl flex items-center justify-center shadow-md">
          <Leaf className="text-white" size={24} />
        </div>
        <div className="hidden md:block">
          <p className="text-lg font-bold text-moss-900">MoHR</p>
          <p className="text-xs text-moss-600">Management of Human Resources</p>
        </div>
      </Link>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          className="flex items-center gap-3 px-4 py-2 hover:bg-moss-50 rounded-lg transition-colors"
        >
          <AvatarDisplay avatar={session?.user?.image} name={name} />
          <div className="hidden sm:block text-left">
            <p className="text-sm font-semibold text-moss-900">{name}</p>
            <p className="text-xs text-moss-500">{session?.user?.role}</p>
          </div>
          <ChevronDown size={16} className={`text-moss-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            {/* Click anywhere else to close */}
            <div className="fixed inset-0" onClick={close} aria-hidden />
            <div className="absolute right-0 mt-2 w-64 p-2 bg-white rounded-xl border-2 border-moss-200 shadow-lg">
              <Link href="/profile" onClick={close} className={`${menuItem} text-moss-700 hover:bg-moss-50`}>
                <User size={18} />
                My Profile
              </Link>
              {session?.user?.role === 'ADMIN' && (
                <Link href="/settings" onClick={close} className={`${menuItem} text-moss-700 hover:bg-moss-50`}>
                  <Settings size={18} />
                  Settings
                </Link>
              )}
              <hr className="my-2 border-moss-100" />
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/login' })}
                className={`${menuItem} text-red-600 hover:bg-red-50`}
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
