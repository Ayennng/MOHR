'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Plus, Pencil, UserX } from 'lucide-react';
import { api, useApi } from '@/lib/api';
import { sortRows, useSort } from '@/lib/sort';
import {
  Alert, Button, Card, Column, Modal, ModalActions, PageHeader, StatCard, Stats, StatusBadge, Table, buttonClass,
} from '@/components/ui';

interface Employee {
  id: string;
  employeeId: string;
  position: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
  user: {
    email: string;
    firstName: string;
    lastName: string;
    department: string | null;
    phone: string | null;
  };
}

export default function EmployeesPage() {
  const { data: session } = useSession();
  // Only admins can add, edit or deactivate employees (enforced by the backend too)
  const isAdmin = session?.user?.role === 'ADMIN';
  const { data, error, loading, reload } = useApi<Employee[]>('/api/employees');
  const employees = data ?? [];
  const sort = useSort('user.firstName');
  const [deactivating, setDeactivating] = useState<Employee | null>(null);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleDeactivate = async () => {
    if (!deactivating) return;
    setSaving(true);
    setDeactivateError(null);
    try {
      await api(`/api/employees/${encodeURIComponent(deactivating.id)}`, { method: 'DELETE' });
      setDeactivating(null);
      reload();
    } catch (err) {
      setDeactivateError(err instanceof Error ? err.message : 'Failed to deactivate employee');
    } finally {
      setSaving(false);
    }
  };

  const departments = new Set(employees.map((e) => e.user.department).filter(Boolean)).size;

  const columns: Column<Employee>[] = [
    { key: 'employeeId', label: 'ID', sortable: true, render: (e) => <span className="tabular-nums text-ink-500">{e.employeeId}</span> },
    {
      key: 'user.firstName',
      label: 'Name',
      sortable: true,
      render: (e) => <span className="font-medium text-ink-900">{`${e.user.firstName} ${e.user.lastName}`}</span>,
    },
    { key: 'user.email', label: 'Email', sortable: true, render: (e) => <span className="text-ink-600">{e.user.email}</span> },
    { key: 'position', label: 'Position', sortable: true },
    { key: 'user.department', label: 'Department', sortable: true, render: (e) => e.user.department ?? <span className="text-ink-400">-</span> },
    { key: 'status', label: 'Status', sortable: true, render: (e) => <StatusBadge status={e.status} /> },
  ];
  if (isAdmin) {
    columns.push({
      key: 'id',
      label: '',
      render: (e) => (
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/employees/${e.id}/edit`}
            className="grid size-8 place-items-center rounded-full text-ink-500 transition-colors duration-150 hover:bg-ink-100 hover:text-ink-900"
            title="Edit"
            aria-label={`Edit ${e.user.firstName} ${e.user.lastName}`}
          >
            <Pencil size={16} />
          </Link>
          {e.status !== 'INACTIVE' && (
            <button
              type="button"
              onClick={() => {
                setDeactivateError(null);
                setDeactivating(e);
              }}
              className="grid size-8 place-items-center rounded-full text-ink-500 transition-colors duration-150 hover:bg-rose-50 hover:text-rose-700"
              title="Deactivate"
              aria-label={`Deactivate ${e.user.firstName} ${e.user.lastName}`}
            >
              <UserX size={16} />
            </button>
          )}
        </div>
      ),
    });
  }

  return (
    <>
      <PageHeader
        title="Employees"
        description={loading ? ' ' : `${employees.length} people across ${departments} departments`}
        action={
          isAdmin && (
            <Link href="/employees/add" className={buttonClass()}>
              <Plus size={16} />
              Add employee
            </Link>
          )
        }
      />

      <Stats cols={3}>
        <StatCard label="Employees" value={employees.length} hint="Everyone with a record, active or not" />
        <StatCard label="Active" value={employees.filter((e) => e.status === 'ACTIVE').length} hint="Can sign in and record attendance" />
        <StatCard label="Departments" value={departments} />
      </Stats>

      <Card title="Directory">
        {error && <Alert>Failed to load employees: {error}</Alert>}
        <Table
          columns={columns}
          data={sortRows(employees, sort.column, sort.direction)}
          loading={loading}
          sortColumn={sort.column}
          sortDirection={sort.direction}
          onSort={sort.toggle}
        />
      </Card>

      <Modal isOpen={!!deactivating} onClose={() => setDeactivating(null)} title="Deactivate employee">
        <div className="space-y-4">
          <Alert>{deactivateError}</Alert>
          <p className="text-[15px] text-ink-600">
            Deactivate {deactivating?.user.firstName} {deactivating?.user.lastName}? They will no longer be able to
            sign in. Their leave and attendance history is kept, and you can reactivate them from Edit.
          </p>
        </div>
        <ModalActions>
          <Button variant="ghost" onClick={() => setDeactivating(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeactivate} isLoading={saving}>
            Deactivate
          </Button>
        </ModalActions>
      </Modal>
    </>
  );
}
