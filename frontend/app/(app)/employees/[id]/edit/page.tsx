'use client';

import { useParams, useRouter } from 'next/navigation';
import { api, useApi } from '@/lib/api';
import { EmployeeForm, type EmployeeFormData } from '@/components/employees/employee-form';
import { Alert, Card, PageHeader, PageSpinner } from '@/components/ui';

interface EmployeeResponse {
  position: string;
  hireDate: string; // YYYY-MM-DD
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
  const { id } = useParams<{ id: string }>();
  const url = `/api/employees/${encodeURIComponent(id)}`;
  const { data: employee, error, loading } = useApi<EmployeeResponse>(url);

  const handleSubmit = async (data: EmployeeFormData) => {
    await api(url, { method: 'PUT', json: data });
    router.push('/employees');
  };

  if (loading) return <PageSpinner />;
  if (!employee) return <Alert>{error ?? 'Employee not found'}</Alert>;

  return (
    <>
      <PageHeader
        back={{ href: '/employees', label: 'Back to employees' }}
        title={`Edit ${employee.user.firstName} ${employee.user.lastName}`}
        description="Update employee information"
      />

      <Card>
        <EmployeeForm
          onSubmit={handleSubmit}
          initialData={{
            firstName: employee.user.firstName,
            lastName: employee.user.lastName,
            email: employee.user.email,
            phone: employee.user.phone ?? '',
            department: employee.user.department ?? '',
            position: employee.position,
            hireDate: employee.hireDate,
            status: employee.status,
          }}
          submitText="Update Employee"
          showStatus
        />
      </Card>
    </>
  );
}
