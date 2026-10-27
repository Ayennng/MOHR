'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check } from 'lucide-react';
import { Alert, Button, Field, buttonClass, inputClass } from '@/components/ui';

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

const leaveSchema = z
  .object({
    leaveType: z.enum(['VACATION', 'SICK', 'PERSONAL', 'UNPAID'], 'Please select a leave type'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    reason: z.string().trim().min(10, 'Reason must be at least 10 characters'),
  })
  .refine((d) => !d.startDate || !d.endDate || d.endDate >= d.startDate, {
    message: 'End date cannot be before start date',
    path: ['endDate'],
  });

type LeaveFormData = z.infer<typeof leaveSchema>;

/** The request form. Throw from `onSubmit` to show the error above it. */
export function LeaveForm({ onSubmit }: { onSubmit: (data: FormData) => Promise<void> }) {
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LeaveFormData>({ resolver: zodResolver(leaveSchema) });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    if (selected && selected.size > MAX_ATTACHMENT_BYTES) {
      setError('File size must be less than 5MB');
      e.target.value = '';
      return;
    }
    setFile(selected);
    setError(null);
  };

  const submit = async (data: LeaveFormData) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => formData.append(key, value));
    if (file) formData.append('attachment', file);

    setError(null);
    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit leave request');
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      <Alert>{error}</Alert>

      <Field label="Leave Type" error={errors.leaveType?.message}>
        <select {...register('leaveType')} className={inputClass} defaultValue="">
          <option value="" disabled>
            Select Leave Type
          </option>
          <option value="VACATION">Vacation</option>
          <option value="SICK">Sick Leave</option>
          <option value="PERSONAL">Personal Leave</option>
          <option value="UNPAID">Unpaid Leave</option>
        </select>
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field label="Start Date" error={errors.startDate?.message}>
          <input {...register('startDate')} type="date" className={inputClass} />
        </Field>
        <Field label="End Date" error={errors.endDate?.message}>
          <input {...register('endDate')} type="date" className={inputClass} />
        </Field>
      </div>

      <Field label="Reason" error={errors.reason?.message}>
        <textarea
          {...register('reason')}
          className={inputClass}
          rows={4}
          placeholder="Please provide a reason for your leave request"
        />
      </Field>

      <Field label="Attachment (optional)" hint="PDF, JPG, PNG or WebP, up to 5MB">
        <input
          type="file"
          onChange={handleFileChange}
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className={`${inputClass} file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-mint-200 file:text-mint-900 file:font-semibold hover:file:bg-mint-300`}
        />
      </Field>
      {file && (
        <p className="-mt-4 flex items-center gap-2 text-sm text-mint-800 animate-fade">
          <Check size={16} />
          {file.name} ({(file.size / 1024).toFixed(1)} KB)
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Link href="/leave" className={buttonClass('ghost')}>
          Cancel
        </Link>
        <Button type="submit" isLoading={isSubmitting}>
          Submit Request
        </Button>
      </div>
    </form>
  );
}
