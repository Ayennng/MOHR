'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Save, Users, Building, Lock, UserPlus } from 'lucide-react';
import { api, useApi } from '@/lib/api';
import type { Role } from '@/lib/auth';
import { Alert, Button, Card, Field, PageHeader, PageSpinner, buttonClass, inputClass } from '@/components/ui';

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
  { id: 'general', label: 'General Settings', icon: Building },
  { id: 'users', label: 'User Management', icon: Users },
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
      setMessage({ tone: 'success', text: 'Settings saved.' });
    } catch (err) {
      setMessage({ tone: 'error', text: err instanceof Error ? err.message : 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="General Settings">
      <div className="space-y-5">
        {message && <Alert tone={message.tone}>{message.text}</Alert>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Company Name">
            <input value={settings.companyName} onChange={set('companyName')} className={inputClass} />
          </Field>
          <Field label="Company Email">
            <input type="email" value={settings.companyEmail} onChange={set('companyEmail')} className={inputClass} />
          </Field>
          <Field label="Time Zone" hint="Used for attendance dates, the 09:30 late cut-off and booking times.">
            <select value={settings.timezone} onChange={set('timezone')} className={inputClass}>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Company Address">
          <textarea value={settings.companyAddress} onChange={set('companyAddress')} className={inputClass} rows={3} />
        </Field>
      </div>

      <div className="flex justify-end mt-6 pt-6 border-t border-moss-100">
        <Button onClick={handleSave} isLoading={saving}>
          <Save size={18} />
          Save Changes
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
      title="User Management"
      description="Change roles and deactivate accounts. Deactivated users can't sign in; their history is kept."
      action={
        <Link href="/employees/add" className={buttonClass()}>
          <UserPlus size={18} />
          Add New User
        </Link>
      }
    >
      <div className="space-y-3">
        <Alert>{updateError ?? error}</Alert>
        {loading && <PageSpinner />}
        {users.map((user) => {
          const isSelf = user.id === currentUserId;
          const busy = updatingId === user.id;
          return (
            <div key={user.id} className="flex flex-wrap items-center justify-between gap-4 p-4 border border-moss-100 rounded-lg">
              <div>
                <p className="font-semibold text-moss-900">
                  {user.firstName} {user.lastName}
                  {isSelf && <span className="ml-2 text-xs text-moss-500">(you)</span>}
                </p>
                <p className="text-sm text-moss-600">{user.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={user.role}
                  disabled={isSelf || busy}
                  onChange={(e) => updateUser(user.id, { role: e.target.value as Role })}
                  className="px-3 py-1.5 border border-moss-200 rounded-lg text-sm text-moss-900 disabled:opacity-60"
                  title={isSelf ? 'You cannot change your own role' : 'Role'}
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <span className={`text-xs px-3 py-1 rounded-full ${user.active ? 'bg-moss-100 text-moss-700' : 'bg-red-100 text-red-700'}`}>
                  {user.active ? 'Active' : 'Inactive'}
                </span>
                {!isSelf && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => updateUser(user.id, { active: !user.active })}
                    className="text-xs font-semibold text-moss-700 hover:underline disabled:opacity-60"
                  >
                    {user.active ? 'Deactivate' : 'Reactivate'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
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
      <div className="max-w-2xl mx-auto bg-red-50 border-2 border-red-200 rounded-2xl p-8 text-center shadow-sm">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock size={32} className="text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-red-900 mb-2">Access Denied</h2>
        <p className="text-red-700 mb-6">System settings are only accessible to administrators.</p>
        <Link href="/dashboard" className={buttonClass()}>
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Admin" title="System Settings" description="Company configuration and user accounts" />

      <div className="bg-white rounded-2xl border border-moss-100 p-2 shadow-sm flex flex-wrap gap-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 font-medium rounded-lg transition-all ${
              tab === id ? 'bg-linear-to-r from-moss-500 to-moss-600 text-white shadow-sm' : 'text-moss-700 hover:bg-moss-50'
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'general' &&
        (settings.data ? (
          <GeneralSettings initial={settings.data} />
        ) : settings.error ? (
          <Alert>{settings.error}</Alert>
        ) : (
          <PageSpinner label="Loading settings..." />
        ))}
      {tab === 'users' && <UserManagement currentUserId={session?.user?.id} />}
    </>
  );
}
