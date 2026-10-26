'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Mail, Building, Shield, Save } from 'lucide-react';
import { api, useApi } from '@/lib/api';
import { humanize } from '@/lib/format';
import AvatarUpload from '@/components/profile/avatar-upload';
import ChangePasswordForm from '@/components/profile/change-password-form';
import { Alert, Button, Card, Field, PageHeader, PageSpinner, inputClass } from '@/components/ui';

interface UserProfile {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department: string | null;
  phone: string | null;
  avatar: string | null;
}

type ProfileForm = Pick<UserProfile, 'firstName' | 'lastName'> & { phone: string; department: string };

const toForm = (p: UserProfile): ProfileForm => ({
  firstName: p.firstName,
  lastName: p.lastName,
  phone: p.phone ?? '',
  department: p.department ?? '',
});

function SummaryRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 shrink-0 rounded-lg bg-moss-100 text-moss-600 flex items-center justify-center">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-moss-600 font-medium">{label}</p>
        <p className="text-sm text-moss-900 truncate">{value}</p>
      </div>
    </div>
  );
}

/** The editable form, mounted once the profile has loaded so it can start from it. */
function ProfileEditor({ profile }: { profile: UserProfile }) {
  const { update } = useSession();
  const [form, setForm] = useState(() => toForm(profile));
  const [avatar, setAvatar] = useState(profile.avatar);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const set = (field: keyof ProfileForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await api<UserProfile>('/api/users/profile', { method: 'PUT', json: form });
      setForm(toForm(updated));
      setSaved(true);
      await update({ user: { name: `${updated.firstName} ${updated.lastName}` } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = (url: string | null) => {
    setAvatar(url);
    update({ user: { image: url } });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card title="Profile Picture">
        <AvatarUpload currentAvatar={avatar} onChange={handleAvatarChange} />
        <div className="mt-6 pt-6 border-t border-moss-100 space-y-3">
          <SummaryRow icon={<Mail size={16} />} label="Email" value={profile.email} />
          <SummaryRow icon={<Shield size={16} />} label="Role" value={humanize(profile.role)} />
          {profile.department && <SummaryRow icon={<Building size={16} />} label="Department" value={profile.department} />}
        </div>
      </Card>

      <div className="lg:col-span-2 space-y-6">
        <Card title="Personal Information">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Alert>{error}</Alert>
            {saved && <Alert tone="success">Profile updated.</Alert>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="First Name">
                <input value={form.firstName} onChange={set('firstName')} className={inputClass} required />
              </Field>
              <Field label="Last Name">
                <input value={form.lastName} onChange={set('lastName')} className={inputClass} required />
              </Field>
            </div>
            <Field label="Email Address" hint="Only an admin can change your email.">
              <input type="email" value={profile.email} disabled className={inputClass} />
            </Field>
            <Field label="Phone Number">
              <input type="tel" value={form.phone} onChange={set('phone')} className={inputClass} placeholder="+60 12-345 6789" />
            </Field>
            <Field label="Department">
              <input value={form.department} onChange={set('department')} className={inputClass} placeholder="e.g., Engineering, HR, Sales" />
            </Field>

            <div className="flex justify-end gap-3 pt-6 border-t border-moss-100">
              <Button variant="ghost" onClick={() => setForm(toForm(profile))}>
                Reset
              </Button>
              <Button type="submit" isLoading={saving}>
                <Save size={18} />
                Save Changes
              </Button>
            </div>
          </form>
        </Card>

        <ChangePasswordForm />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { data: profile, error, loading } = useApi<UserProfile>('/api/users/profile');

  return (
    <>
      <PageHeader eyebrow="My Profile" title="Profile Settings" description="Manage your personal information and password" />
      {loading ? <PageSpinner /> : profile ? <ProfileEditor profile={profile} /> : <Alert>{error ?? 'Failed to load profile'}</Alert>}
    </>
  );
}
