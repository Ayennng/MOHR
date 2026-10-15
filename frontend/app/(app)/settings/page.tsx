'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Save, Users, Building, Lock, Bell, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Settings {
  id: string;
  companyName: string;
  companyEmail: string;
  companyAddress: string;
  timezone: string;
  dateFormat: string;
  sessionTimeout: number;
  require2FA: boolean;
  ipWhitelist: boolean;
  notifyLeaveRequests: boolean;
  notifyAttendanceAlert: boolean;
  notifySystemUpdates: boolean;
  notifyBirthdays: boolean;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  active: boolean;
}

// IANA timezone names, e.g. "Asia/Kuala_Lumpur"
const TIMEZONES = ['UTC', ...Intl.supportedValuesOf('timeZone').filter((tz) => tz !== 'UTC')];

export default function SettingsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchSettings();
      fetchUsers();
    }
  }, [session]);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/settings');
      if (!response.ok) throw new Error(`Settings request failed (${response.status})`);
      setSettings(await response.json());
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setIsSaving(true);
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (response.ok) {
        alert('Settings saved successfully!');
      } else {
        const result = await response.json().catch(() => ({}));
        alert(result.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const updateUser = async (id: string, patch: { role?: string; active?: boolean }) => {
    if (patch.active === false && !confirm('Deactivate this user? They will no longer be able to sign in.')) {
      return;
    }
    try {
      setUpdatingUserId(id);
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Failed to update user');
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...result } : u)));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update user');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const updateSetting = (field: keyof Settings, value: any) => {
    if (settings) {
      setSettings({ ...settings, [field]: value });
    }
  };

  const isAdmin = session?.user?.role === 'ADMIN';

  // Settings are only fetched for admins, so only admins wait on them
  if (sessionStatus === 'loading' || (isAdmin && isLoading)) {
    return (
      <div>
        <div className="max-w-2xl mx-auto text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-moss-600 mx-auto"></div>
          <p className="mt-4 text-moss-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div>
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock size={32} className="text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-red-900 mb-2">Access Denied</h2>
            <p className="text-red-700 mb-6">
              System settings are only accessible to administrators.
              <br />
              Please contact your administrator if you need to change system configurations.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-2 px-6 py-3 bg-moss-500 hover:bg-moss-600 text-white rounded-lg font-medium transition-colors"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => router.push('/profile')}
                className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-moss-50 text-moss-700 border border-moss-300 rounded-lg font-medium transition-colors"
              >
                View My Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'General Settings', icon: Building },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-moss-100 overflow-hidden">
          <div className="bg-gradient-to-r from-moss-500 to-moss-600 px-8 py-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 mb-4 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-all border border-white/20 hover:border-white/30 backdrop-blur-sm"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>
            <div className="flex items-center gap-3 text-white/90 text-sm font-medium mb-2">
              <Lock size={16} />
              ADMIN PANEL
            </div>
            <h1 className="text-3xl font-bold text-white mb-1">
              System Settings
            </h1>
            <p className="text-moss-50">Manage company configuration and preferences</p>
          </div>
        </div>

        {/* Modern Tabs */}
        <div className="bg-white rounded-2xl border border-moss-100 p-2 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 font-medium rounded-lg transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-moss-500 to-moss-600 text-white shadow-sm'
                      : 'text-moss-700 hover:bg-moss-50'
                  }`}
                >
                  <IconComponent size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* General Settings */}
        {activeTab === 'general' && (
          <div className="bg-white rounded-2xl shadow-sm border border-moss-100 p-6">
            <h2 className="text-lg font-bold text-moss-900 mb-6 flex items-center gap-2">
              <div className="w-1 h-5 bg-moss-500 rounded-full"></div>
              General Settings
            </h2>

            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-moss-700 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={settings?.companyName || ''}
                    onChange={(e) => updateSetting('companyName', e.target.value)}
                    className="w-full px-4 py-2.5 border border-moss-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss-500 focus:border-transparent transition-all text-moss-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-moss-700 mb-2">
                    Company Email
                  </label>
                  <input
                    type="email"
                    value={settings?.companyEmail || ''}
                    onChange={(e) => updateSetting('companyEmail', e.target.value)}
                    className="w-full px-4 py-2.5 border border-moss-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss-500 focus:border-transparent transition-all text-moss-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-moss-700 mb-2">
                    Time Zone
                  </label>
                  <select
                    value={settings?.timezone || 'UTC'}
                    onChange={(e) => updateSetting('timezone', e.target.value)}
                    className="w-full px-4 py-2.5 border border-moss-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss-500 focus:border-transparent transition-all text-moss-900"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-moss-600">
                    Used for attendance dates and the 9:30 late cut-off.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-moss-700 mb-2">
                    Date Format
                  </label>
                  {/* Not applied anywhere yet, so read-only rather than a setting that does nothing */}
                  <select
                    value={settings?.dateFormat || 'MM/DD/YYYY'}
                    disabled
                    className="w-full px-4 py-2.5 border border-moss-200 rounded-lg text-moss-900 opacity-60 cursor-not-allowed"
                  >
                    <option>MM/DD/YYYY</option>
                    <option>DD/MM/YYYY</option>
                    <option>YYYY-MM-DD</option>
                  </select>
                  <p className="mt-1 text-xs text-moss-600">Not available yet: dates are shown in each browser&apos;s format.</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-moss-700 mb-2">
                  Company Address
                </label>
                <textarea
                  value={settings?.companyAddress || ''}
                  onChange={(e) => updateSetting('companyAddress', e.target.value)}
                  className="w-full px-4 py-2.5 border border-moss-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss-500 focus:border-transparent transition-all text-moss-900"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end mt-6 pt-6 border-t border-moss-100">
              <Button onClick={handleSave} isLoading={isSaving} className="gap-2 px-6 py-2.5 bg-gradient-to-r from-moss-500 to-moss-600 text-white rounded-lg font-medium hover:from-moss-600 hover:to-moss-700 transition-all shadow-sm">
                <Save size={18} />
                Save Changes
              </Button>
            </div>
          </div>
        )}

        {/* User Management */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl shadow-sm border border-moss-100 p-6">
            <h2 className="text-lg font-bold text-moss-900 mb-6 flex items-center gap-2">
              <div className="w-1 h-5 bg-moss-500 rounded-full"></div>
              User Management
            </h2>

            {users.length === 0 ? (
              <div className="text-center py-8 text-moss-600">
                <p>No users found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((user) => {
                  const isSelf = user.id === session?.user?.id;
                  return (
                    <div key={user.id} className="flex items-center justify-between gap-4 p-4 border border-moss-100 rounded-lg">
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
                          disabled={isSelf || updatingUserId === user.id}
                          onChange={(e) => updateUser(user.id, { role: e.target.value })}
                          className="px-3 py-1.5 border border-moss-200 rounded-lg text-sm text-moss-900 disabled:opacity-60"
                          title={isSelf ? 'You cannot change your own role' : 'Role'}
                        >
                          <option value="EMPLOYEE">Employee</option>
                          <option value="MANAGER">Manager</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                        <span className={`text-xs px-3 py-1 rounded-full ${
                          user.active
                            ? 'bg-moss-100 text-moss-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {user.active ? 'Active' : 'Inactive'}
                        </span>
                        {!isSelf && (
                          <button
                            type="button"
                            disabled={updatingUserId === user.id}
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
            )}

            <div className="flex justify-end mt-6 pt-6 border-t border-moss-100">
              <Button 
                onClick={() => router.push('/employees/add')}
                className="gap-2 px-6 py-2.5 bg-gradient-to-r from-moss-500 to-moss-600 text-white rounded-lg font-medium hover:from-moss-600 hover:to-moss-700 transition-all shadow-sm"
              >
                <Users size={18} />
                Add New User
              </Button>
            </div>
          </div>
        )}

        {/* Security Settings: shown read-only until these features exist */}
        {activeTab === 'security' && (
          <div className="bg-white rounded-2xl shadow-sm border border-moss-100 p-6">
            <h2 className="text-lg font-bold text-moss-900 mb-6 flex items-center gap-2">
              <div className="w-1 h-5 bg-moss-500 rounded-full"></div>
              Security Settings
            </h2>

            <NotAvailableNotice>
              These options are not enforced yet, so they can't be changed. Currently, sign-in sessions last
              24 hours, accounts are locked for 15 minutes after 5 failed sign-ins, and access is not
              restricted by IP address.
            </NotAvailableNotice>

            <div className="space-y-4">
              {[
                { label: 'Session Timeout', description: `Log users out after ${settings?.sessionTimeout ?? 30} minutes` },
                { label: 'Two-Factor Authentication', description: 'Require 2FA for all admin accounts' },
                { label: 'IP Whitelisting', description: 'Restrict access to specific IP addresses' },
              ].map((item) => (
                <DisabledSetting key={item.label} {...item} />
              ))}
            </div>
          </div>
        )}

        {/* Notifications: the app can't send email yet, so these are read-only */}
        {activeTab === 'notifications' && (
          <div className="bg-white rounded-2xl shadow-sm border border-moss-100 p-6">
            <h2 className="text-lg font-bold text-moss-900 mb-6 flex items-center gap-2">
              <div className="w-1 h-5 bg-moss-500 rounded-full"></div>
              Notification Settings
            </h2>

            <NotAvailableNotice>
              MoHR doesn&apos;t send notifications yet. Pending leave requests show as a badge in the sidebar.
            </NotAvailableNotice>

            <div className="space-y-4">
              {[
                { label: 'New Leave Requests', description: 'Notify when employees request leave' },
                { label: 'Attendance Alerts', description: 'Alert for low attendance' },
                { label: 'System Updates', description: 'Notify about system updates' },
                { label: 'Employee Birthdays', description: 'Remind on employee birthdays' },
              ].map((item) => (
                <DisabledSetting key={item.label} {...item} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NotAvailableNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
      <p className="font-semibold mb-1">Not available yet</p>
      <p>{children}</p>
    </div>
  );
}

function DisabledSetting({ label, description }: { label: string; description: string }) {
  return (
    <div className="p-4 bg-moss-50/50 rounded-lg border border-moss-200 flex items-center justify-between opacity-70">
      <div>
        <h3 className="font-semibold text-moss-900">{label}</h3>
        <p className="text-sm text-moss-600 mt-1">{description}</p>
      </div>
      <span className="text-xs px-3 py-1 rounded-full bg-moss-100 text-moss-600">Coming soon</span>
    </div>
  );
}
