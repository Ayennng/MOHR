'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Save, Users, Building, Lock, UserPlus } from 'lucide-react';
import { api, useApi } from '@/lib/api';
import type { Role } from '@/lib/auth';
import {
  Alert, Button, Card, Field, PageHeader, PageSpinner, Segmented, StatusBadge, buttonClass, inputClass,
} from '@/components/ui';

interface Settings {
  companyName: string;
  companyEmail: string;
  companyAddress: string;
  timezone: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  active: boolean;
}

// IANA timezone names, e.g. "Asia/Kuala_Lumpur"
const TIMEZONES = ['UTC', ...Intl.supportedValuesOf('timeZone').filter((tz) => tz !== 'UTC')];

const TABS = [
  { id: 'general', label: 'Company', icon: Building },
  { id: 'users', label: 'Users', icon: Users },
] as const;

function GeneralSettings({ initial }: { initial: Settings }) {
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const set = (field: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setSettings({ ...settings, [field]: e.target.value });

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      setSettings(await api<Settings>('/api/settings', { method: 'PUT', json: settings }));
      setMessage({ tone: 'success', text: 'Settings saved' });
    } catch (err) {
      setMessage({ tone: 'error', text: err instanceof Error ? err.message : 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Company" className="max-w-3xl">
      <div className="space-y-5">
        {message && <Alert tone={message.tone}>{message.text}</Alert>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Company name">
            <input value={settings.companyName} onChange={set('companyName')} className={inputClass} />
          </Field>
          <Field label="Company email">
            <input type="email" value={settings.companyEmail} onChange={set('companyEmail')} className={inputClass} />
          </Field>
          <Field label="Time zone" hint="Sets what counts as today, the 09:30 late cut-off and booking times">
            <select value={settings.timezone} onChange={set('timezone')} className={inputClass}>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Company address">
          <textarea value={settings.companyAddress} onChange={set('companyAddress')} className={inputClass} rows={3} />
        </Field>
      </div>

      <div className="mt-6 flex justify-end border-t border-ink-900/8 pt-5">
        <Button onClick={handleSave} isLoading={saving}>
          <Save size={16} />
          Save changes
        </Button>
      </div>
    </Card>
  );
}

function UserManagement({ currentUserId }: { currentUserId?: string }) {
  const { data, error, loading } = useApi<User[]>('/api/users');
  // Edits made here, laid over the loaded list
  const [changed, setChanged] = useState<Record<string, User>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const users = (data ?? []).map((u) => changed[u.id] ?? u);

  const updateUser = async (id: string, patch: { role?: Role; active?: boolean }) => {
    if (patch.active === false && !confirm('Deactivate this user? They will no longer be able to sign in.')) return;
    setUpdatingId(id);
    setUpdateError(null);
    try {
      const user = await api<User>('/api/users', { method: 'PUT', json: { id, ...patch } });
      setChanged((prev) => ({ ...prev, [id]: user }));
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <Card
      title="Users"
      description="Change roles and deactivate accounts. Deactivated users can’t sign in, and their history is kept."
      action={
        <Link href="/employees/add" className={buttonClass('outline', 'sm')}>
          <UserPlus size={16} />
          Add user
        </Link>
      }
    >
      <div className="space-y-3">
        <Alert>{updateError ?? error}</Alert>
        {loading && <PageSpinner />}
        <ul className="-mx-6 divide-y divide-ink-900/6 border-t border-ink-900/8">
        {users.map((user) => {
          const isSelf = user.id === currentUserId;
          const busy = updatingId === user.id;
          return (
            <li key={user.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 transition-colors duration-150 hover:bg-ink-50">
              <div>
                <p className="text-sm font-medium text-ink-900">
                  {user.firstName} {user.lastName}
                  {isSelf && <span className="ml-1.5 font-normal text-ink-500">(you)</span>}
                </p>
                <p className="text-[13px] text-ink-500">{user.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={user.role}
                  disabled={isSelf || busy}
                  onChange={(e) => updateUser(user.id, { role: e.target.value as Role })}
                  className="h-8 rounded-full border border-ink-900/12 bg-white px-3 text-[13px] text-ink-900 transition-colors duration-150 hover:border-ink-900/20 disabled:opacity-60"
                  title={isSelf ? 'You cannot change your own role' : 'Role'}
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <StatusBadge status={user.active ? 'ACTIVE' : 'INACTIVE'} />
                {!isSelf && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => updateUser(user.id, { active: !user.active })}
                    className="h-8 rounded-full px-3 text-[13px] font-medium text-ink-600 transition-colors duration-150 hover:bg-ink-100 hover:text-ink-900 disabled:opacity-60"
                  >
                    {user.active ? 'Deactivate' : 'Reactivate'}
                  </button>
                )}
              </div>
            </li>
          );
        })}
        </ul>
      </div>
    </Card>
  );
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('general');
  const settings = useApi<Settings>(isAdmin ? '/api/settings' : null);

  if (status === 'loading') return <PageSpinner />;

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md rounded-card border border-ink-900/8 bg-white p-10 text-center shadow-soft animate-rise">
        <div className="mx-auto mb-5 grid size-11 place-items-center rounded-xl bg-ink-100 text-ink-600">
          <Lock size={20} />
        </div>
        <h1 className="text-2xl font-medium text-ink-900">Admins only</h1>
        <p className="mt-2 mb-6 text-[15px] text-ink-600">Only administrators can change company settings.</p>
        <Link href="/dashboard" className={buttonClass()}>
          Go to dashboard
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Settings" description="Company details and the people who can sign in" />

      <Segmented
        label="Settings sections"
        options={TABS.map(({ id, label, icon: Icon }) => ({ value: id, label, icon: <Icon size={16} /> }))}
        value={tab}
        onChange={setTab}
      />

      {tab === 'general' &&
        (settings.data ? (
          <GeneralSettings initial={settings.data} />
        ) : settings.error ? (
          <Alert>{settings.error}</Alert>
        ) : (
          <PageSpinner label="Loading settings" />
        ))}
      {tab === 'users' && <UserManagement currentUserId={session?.user?.id} />}
    </>
  );
}
