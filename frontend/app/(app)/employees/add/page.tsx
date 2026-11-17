'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Copy, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { EmployeeForm, type EmployeeFormData } from '@/components/employees/employee-form';
import { Button, Card, PageHeader, buttonClass } from '@/components/ui';

interface CreatedEmployee {
  employeeId: string;
  email: string;
  temporaryPassword: string;
}

export default function AddEmployeePage() {
  const [created, setCreated] = useState<CreatedEmployee | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (data: EmployeeFormData) => {
    const result = await api<Omit<CreatedEmployee, 'email'>>('/api/employees', { method: 'POST', json: data });
    setCreated({ ...result, email: data.email });
  };

  const copyPassword = async () => {
    if (!created) return;
    await navigator.clipboard.writeText(created.temporaryPassword);
    setCopied(true);
  };

  return (
    <>
      <PageHeader
        back={{ href: '/employees', label: 'Employees' }}
        title="Add employee"
        description="Creates their sign-in and their employee record"
      />

      <Card className="max-w-3xl">
        {created ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-ink-900">Employee {created.employeeId} created</h2>
            <p className="text-[15px] text-ink-600">
              Give <span className="font-medium text-ink-900">{created.email}</span> this temporary password. It is shown only once; ask them to
              change it from their profile after signing in.
            </p>
            <div className="flex items-center gap-3">
              <code className="rounded-lg border border-ink-900/8 bg-ink-50 px-3 py-1.5 font-mono text-base text-ink-900">
                {created.temporaryPassword}
              </code>
              <Button variant="ghost" onClick={copyPassword}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <div className="flex gap-3 pt-2">
              <Link href="/employees" className={buttonClass()}>
                Back to employees
              </Link>
              <Button
                variant="ghost"
                onClick={() => {
                  setCreated(null);
                  setCopied(false);
                }}
              >
                Add another
              </Button>
            </div>
          </div>
        ) : (
          <EmployeeForm onSubmit={handleSubmit} submitText="Create employee" />
        )}
      </Card>
    </>
  );
}
