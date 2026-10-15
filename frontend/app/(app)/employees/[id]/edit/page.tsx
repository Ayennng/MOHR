'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { EmployeeForm, type EmployeeFormData } from '@/components/employees/employee-form';

interface EmployeeResponse {
  id: string;
  position: string;
  hireDate: string;
  status: EmployeeFormData['status'];
  user: {
    email: string;
    firstName: string;
    lastName: string;
    department: string | null;
    phone: string | null;
  };
}

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [employee, setEmployee] = useState<EmployeeFormData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchEmployee = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/employees/${encodeURIComponent(id)}`);
        if (!response.ok) {
          throw new Error(response.status === 404 ? 'Employee not found' : 'Failed to load employee');
        }
        const data: EmployeeResponse = await response.json();
        setEmployee({
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          email: data.user.email,
          phone: data.user.phone ?? '',
          department: data.user.department ?? '',
          position: data.position,
          hireDate: data.hireDate.slice(0, 10),
          status: data.status,
        });
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Failed to load employee');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmployee();
  }, [id]);

  const handleSubmit = async (data: EmployeeFormData) => {
    try {
      setIsSaving(true);
      const response = await fetch(`/api/employees/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to update employee');
      }
      router.push('/employees');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-moss-500"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {loadError ?? 'Employee not found'}
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold text-moss-900">
            Edit {employee.firstName} {employee.lastName}
          </h1>
          <p className="text-moss-600 mt-1">Update employee information</p>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-lg border border-moss-100 p-6">
        <EmployeeForm
          onSubmit={handleSubmit}
          isLoading={isSaving}
          initialData={employee}
          submitText="Update Employee"
          showStatus
        />
      </div>
    </div>
  );
}
