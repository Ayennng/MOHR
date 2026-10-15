'use client';

import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';

const inputClass =
  'w-full px-4 py-2.5 border border-moss-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss-500 focus:border-transparent transition-all text-moss-900';

const emptyForm = { currentPassword: '', newPassword: '', confirmPassword: '' };

// Same rules the backend enforces (passwordSchema)
function passwordProblem(password: string) {
  if (password.length < 8) return 'New password must be at least 8 characters';
  if (password.length > 72) return 'New password must be at most 72 characters';
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'New password must contain a letter and a number';
  }
  return null;
}

export default function ChangePasswordForm() {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);

    const problem = passwordProblem(form.newPassword);
    if (problem) return setError(problem);
    if (form.newPassword !== form.confirmPassword) return setError("New passwords don't match");

    try {
      setSaving(true);
      setError(null);
      const response = await fetch('/api/users/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Failed to change password');

      setForm(emptyForm);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const field = (name: keyof typeof emptyForm, label: string, autoComplete: string) => (
    <div>
      <label className="block text-sm font-medium text-moss-700 mb-2">{label}</label>
      <input
        type="password"
        value={form[name]}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        className={inputClass}
        autoComplete={autoComplete}
        required
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-moss-100 p-6 mt-6">
      <h2 className="text-lg font-bold text-moss-900 mb-6 flex items-center gap-2">
        <div className="w-1 h-5 bg-moss-500 rounded-full"></div>
        Change Password
      </h2>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
      )}
      {success && (
        <div className="mb-4 bg-moss-50 border border-moss-200 rounded-lg p-3 text-moss-800 text-sm">
          Password changed.
        </div>
      )}

      <div className="space-y-5">
        {field('currentPassword', 'Current Password', 'current-password')}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field('newPassword', 'New Password', 'new-password')}
          {field('confirmPassword', 'Confirm New Password', 'new-password')}
        </div>
        <p className="text-xs text-moss-600">At least 8 characters, including a letter and a number.</p>
      </div>

      <div className="flex justify-end mt-6 pt-6 border-t border-moss-100">
        <Button type="submit" isLoading={saving} className="px-8 py-2.5 flex items-center gap-2">
          <KeyRound size={18} />
          Change Password
        </Button>
      </div>
    </form>
  );
}
