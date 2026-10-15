'use client';

import React, { useState } from 'react';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import Link from 'next/link';
import { EmployeeForm, type EmployeeFormData } from '@/components/employees/employee-form';
import { Button } from '@/components/ui/button';

interface CreatedEmployee {
  employeeId: string;
  email: string;
  temporaryPassword: string;
}

export default function AddEmployeePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [created, setCreated] = useState<CreatedEmployee | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (data: EmployeeFormData) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create employee');
      }
      setCreated({
        employeeId: result.employeeId,
        email: data.email,
        temporaryPassword: result.temporaryPassword,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyPassword = async () => {
    if (!created) return;
    await navigator.clipboard.writeText(created.temporaryPassword);
    setCopied(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/employees"
          className="p-2 hover:bg-moss-50 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} className="text-moss-600" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-moss-900">Add New Employee</h1>
          <p className="text-moss-600 mt-1">Create a new employee record</p>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-lg border border-moss-100 p-6">
        {created ? (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-moss-900">
              Employee {created.employeeId} created
            </h2>
            <p className="text-moss-700">
              Give <strong>{created.email}</strong> this temporary password. It is shown only
              once; ask them to change it from their profile after signing in.
            </p>
            <div className="flex items-center gap-3">
              <code className="px-4 py-2 bg-moss-50 border border-moss-200 rounded-lg text-lg font-mono text-moss-900">
                {created.temporaryPassword}
              </code>
              <Button variant="ghost" type="button" onClick={copyPassword}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <div className="flex gap-3 pt-2">
              <Link href="/employees">
                <Button type="button">Back to employees</Button>
              </Link>
              <Button
                variant="ghost"
                type="button"
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
          <EmployeeForm
            onSubmit={handleSubmit}
            isLoading={isLoading}
            submitText="Create Employee"
          />
        )}
      </div>
    </div>
  );
}
