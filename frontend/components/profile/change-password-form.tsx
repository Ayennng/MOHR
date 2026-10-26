'use client';

import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { api } from '@/lib/api';
import { Alert, Button, Card, Field, inputClass } from '@/components/ui';

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

    const problem =
      passwordProblem(form.newPassword) ??
      (form.newPassword !== form.confirmPassword ? "New passwords don't match" : null);
    if (problem) return setError(problem);

    try {
      setSaving(true);
      setError(null);
      await api('/api/users/password', {
        method: 'PUT',
        json: { currentPassword: form.currentPassword, newPassword: form.newPassword },
      });
      setForm(emptyForm);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const input = (name: keyof typeof emptyForm, autoComplete: string) => (
    <input
      type="password"
      value={form[name]}
      onChange={(e) => setForm({ ...form, [name]: e.target.value })}
      className={inputClass}
      autoComplete={autoComplete}
      required
    />
  );

  return (
    <Card title="Change Password">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Alert>{error}</Alert>
        {success && <Alert tone="success">Password changed.</Alert>}

        <Field label="Current Password">{input('currentPassword', 'current-password')}</Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="New Password" hint="At least 8 characters, including a letter and a number.">
            {input('newPassword', 'new-password')}
          </Field>
          <Field label="Confirm New Password">{input('confirmPassword', 'new-password')}</Field>
        </div>

        <div className="flex justify-end pt-6 border-t border-moss-100">
          <Button type="submit" isLoading={saving}>
            <KeyRound size={18} />
            Change Password
          </Button>
        </div>
      </form>
    </Card>
  );
}
