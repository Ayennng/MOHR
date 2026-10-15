'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';

const leaveSchema = z.object({
  leaveType: z.string()
    .min(1, 'Please select a leave type')
    .refine((val) => ['VACATION', 'SICK', 'PERSONAL', 'UNPAID'].includes(val), {
      message: 'Please select a valid leave type',
    }),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  reason: z.string().trim().min(10, 'Reason must be at least 10 characters'),
}).refine((d) => !d.startDate || !d.endDate || d.endDate >= d.startDate, {
  message: 'End date cannot be before start date',
  path: ['endDate'],
});

type LeaveFormData = z.infer<typeof leaveSchema>;

export interface LeaveFormProps {
  onSubmit: (data: LeaveFormData) => Promise<void>;
  isLoading?: boolean;
  submitText?: string;
}

export function LeaveForm({
  onSubmit,
  isLoading,
  submitText = 'Submit Request',
}: LeaveFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LeaveFormData>({
    resolver: zodResolver(leaveSchema),
    defaultValues: {
      leaveType: undefined,
      startDate: '',
      endDate: '',
      reason: '',
    },
  });

  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        e.target.value = '';
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleFormSubmit = async (data: LeaveFormData) => {
    try {
      setError(null);
      // Add file to the data if selected
      const submitData = {
        ...data,
        attachment: selectedFile,
      };
      await onSubmit(submitData);
    } catch (err) {
      console.error('Form submission error:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit leave request');
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}
      {Object.keys(errors).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-700 text-sm">
          <p className="font-semibold mb-2">Please fix the following errors:</p>
          <ul className="list-disc list-inside space-y-1">
            {errors.leaveType && <li>{errors.leaveType.message}</li>}
            {errors.startDate && <li>{errors.startDate.message}</li>}
            {errors.endDate && <li>{errors.endDate.message}</li>}
            {errors.reason && <li>{errors.reason.message}</li>}
          </ul>
        </div>
      )}

      {/* Leave Type */}
      <div>
        <label className="block text-sm font-semibold text-moss-900 mb-2">
          Leave Type *
        </label>
        <select
          {...register('leaveType')}
          className="w-full px-4 py-3 border-2 border-moss-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss-500 focus:border-moss-500 bg-white text-moss-900 font-medium"
        >
          <option value="">Select Leave Type</option>
          <option value="VACATION">Vacation</option>
          <option value="SICK">Sick Leave</option>
          <option value="PERSONAL">Personal Leave</option>
          <option value="UNPAID">Unpaid Leave</option>
        </select>
        {errors.leaveType && (
          <p className="text-red-600 text-sm mt-1">{errors.leaveType.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Start Date */}
        <div>
          <label className="block text-sm font-semibold text-moss-900 mb-2">
            Start Date *
          </label>
          <input
            {...register('startDate')}
            type="date"
            className="w-full px-4 py-3 border-2 border-moss-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss-500 focus:border-moss-500 bg-white text-moss-900 font-medium"
          />
          {errors.startDate && (
            <p className="text-red-600 text-sm mt-1">{errors.startDate.message}</p>
          )}
        </div>

        {/* End Date */}
        <div>
          <label className="block text-sm font-semibold text-moss-900 mb-2">
            End Date *
          </label>
          <input
            {...register('endDate')}
            type="date"
            className="w-full px-4 py-3 border-2 border-moss-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss-500 focus:border-moss-500 bg-white text-moss-900 font-medium"
          />
          {errors.endDate && (
            <p className="text-red-600 text-sm mt-1">{errors.endDate.message}</p>
          )}
        </div>
      </div>

      {/* Reason */}
      <div>
        <label className="block text-sm font-semibold text-moss-900 mb-2">
          Reason *
        </label>
        <textarea
          {...register('reason')}
          className="w-full px-4 py-3 border-2 border-moss-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss-500 focus:border-moss-500 bg-white text-moss-900 font-medium placeholder:text-moss-400"
          rows={4}
          placeholder="Please provide a reason for your leave request"
        />
        {errors.reason && (
          <p className="text-red-600 text-sm mt-1">{errors.reason.message}</p>
        )}
      </div>

      {/* Attachments */}
      <div>
        <label className="block text-sm font-semibold text-moss-900 mb-2">
          Attachments (Optional)
        </label>
        <input
          type="file"
          onChange={handleFileChange}
          className="w-full px-4 py-3 border-2 border-moss-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss-500 focus:border-moss-500 bg-white text-moss-900 font-medium file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-moss-100 file:text-moss-700 file:font-semibold hover:file:bg-moss-200"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
        />
        {selectedFile && (
          <p className="text-green-600 text-sm mt-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
          </p>
        )}
        <p className="text-moss-600 text-xs mt-1">
          Accepted formats: PDF, JPG, PNG, WebP (Max 5MB)
        </p>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-3">
        <Button variant="ghost" type="button">
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading || isSubmitting} disabled={isLoading || isSubmitting}>
          {submitText}
        </Button>
      </div>
    </form>
  );
}
