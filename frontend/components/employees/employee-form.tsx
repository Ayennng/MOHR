'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';

// Mirrors the User + Employee fields the backend stores
const employeeSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  email: z.string().trim().email('Valid email required'),
  phone: z.string().trim().optional(),
  position: z.string().trim().min(2, 'Position is required'),
  department: z.string().trim().optional(),
  hireDate: z.string().min(1, 'Hire date is required'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE']),
});

export type EmployeeFormData = z.infer<typeof employeeSchema>;

const DEPARTMENT_SUGGESTIONS = ['Engineering', 'Sales', 'HR', 'Finance', 'Operations', 'IT'];

export interface EmployeeFormProps {
  onSubmit: (data: EmployeeFormData) => Promise<void>;
  isLoading?: boolean;
  initialData?: Partial<EmployeeFormData>;
  submitText?: string;
  /** Status is only editable for existing employees */
  showStatus?: boolean;
}

const inputClass =
  'w-full px-4 py-2 border border-moss-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss-500';

export function EmployeeForm({
  onSubmit,
  isLoading,
  initialData,
  submitText = 'Save Employee',
  showStatus = false,
}: EmployeeFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      hireDate: new Date().toISOString().slice(0, 10),
      status: 'ACTIVE',
      ...initialData,
    },
  });

  const [error, setError] = useState<string | null>(null);

  const handleFormSubmit = async (data: EmployeeFormData) => {
    try {
      setError(null);
      await onSubmit(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save employee');
    }
  };

  const field = (
    name: keyof EmployeeFormData,
    label: string,
    input: React.ReactNode
  ) => (
    <div>
      <label className="block text-sm font-medium text-moss-900 mb-1">{label}</label>
      {input}
      {errors[name] && <p className="text-red-600 text-sm mt-1">{errors[name]?.message}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {field('firstName', 'First Name', (
          <input {...register('firstName')} type="text" className={inputClass} placeholder="John" />
        ))}
        {field('lastName', 'Last Name', (
          <input {...register('lastName')} type="text" className={inputClass} placeholder="Doe" />
        ))}
        {field('email', 'Email', (
          <input {...register('email')} type="email" className={inputClass} placeholder="john@example.com" />
        ))}
        {field('phone', 'Phone (optional)', (
          <input {...register('phone')} type="tel" className={inputClass} placeholder="+60 12-345 6789" />
        ))}
        {field('position', 'Position', (
          <input {...register('position')} type="text" className={inputClass} placeholder="Software Engineer" />
        ))}
        {field('department', 'Department (optional)', (
          <>
            <input
              {...register('department')}
              type="text"
              list="department-suggestions"
              className={inputClass}
              placeholder="Engineering"
            />
            <datalist id="department-suggestions">
              {DEPARTMENT_SUGGESTIONS.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </>
        ))}
        {field('hireDate', 'Hire Date', (
          <input {...register('hireDate')} type="date" className={inputClass} />
        ))}
        {showStatus && field('status', 'Status', (
          <select {...register('status')} className={inputClass}>
            <option value="ACTIVE">Active</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        ))}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-3">
        <Button variant="ghost" type="button" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading}>
          {submitText}
        </Button>
      </div>
    </form>
  );
}
