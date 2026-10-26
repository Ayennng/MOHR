'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Button, Field, buttonClass, inputClass } from '@/components/ui';

// Mirrors the User + Employee fields the backend stores
const employeeSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  email: z.string().trim().pipe(z.email('Valid email required')),
  phone: z.string().trim().optional(),
  position: z.string().trim().min(2, 'Position is required'),
  department: z.string().trim().optional(),
  hireDate: z.string().min(1, 'Hire date is required'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE']),
});

export type EmployeeFormData = z.infer<typeof employeeSchema>;

const DEPARTMENT_SUGGESTIONS = ['Engineering', 'Sales', 'HR', 'Finance', 'Operations', 'IT'];

export function EmployeeForm({
  onSubmit,
  initialData,
  submitText,
  showStatus = false,
}: {
  /** Throw to show the error above the form. */
  onSubmit: (data: EmployeeFormData) => Promise<void>;
  initialData?: EmployeeFormData;
  submitText: string;
  /** Status is only editable for existing employees */
  showStatus?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: initialData ?? { hireDate: new Date().toISOString().slice(0, 10), status: 'ACTIVE' },
  });

  const submit = async (data: EmployeeFormData) => {
    setError(null);
    try {
      await onSubmit(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save employee');
    }
  };

  const field = (name: keyof EmployeeFormData, label: string, input: React.ReactNode) => (
    <Field label={label} error={errors[name]?.message}>
      {input}
    </Field>
  );

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      <Alert>{error}</Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {field('firstName', 'First Name', <input {...register('firstName')} className={inputClass} placeholder="John" />)}
        {field('lastName', 'Last Name', <input {...register('lastName')} className={inputClass} placeholder="Doe" />)}
        {field('email', 'Email', <input {...register('email')} type="email" className={inputClass} placeholder="john@example.com" />)}
        {field('phone', 'Phone (optional)', <input {...register('phone')} type="tel" className={inputClass} placeholder="+60 12-345 6789" />)}
        {field('position', 'Position', <input {...register('position')} className={inputClass} placeholder="Software Engineer" />)}
        {field('department', 'Department (optional)', (
          <>
            <input {...register('department')} list="department-suggestions" className={inputClass} placeholder="Engineering" />
            <datalist id="department-suggestions">
              {DEPARTMENT_SUGGESTIONS.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </>
        ))}
        {field('hireDate', 'Hire Date', <input {...register('hireDate')} type="date" className={inputClass} />)}
        {showStatus && field('status', 'Status', (
          <select {...register('status')} className={inputClass}>
            <option value="ACTIVE">Active</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        ))}
      </div>

      <div className="flex justify-end gap-3">
        <Link href="/employees" className={buttonClass('ghost')}>
          Cancel
        </Link>
        <Button type="submit" isLoading={isSubmitting}>
          {submitText}
        </Button>
      </div>
    </form>
  );
}
