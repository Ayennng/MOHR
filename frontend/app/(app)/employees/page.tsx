'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Plus, Edit2, Trash2, Users, Building } from 'lucide-react';
import { api, useApi } from '@/lib/api';
import { sortRows, useSort } from '@/lib/sort';
import {
  Alert, Button, Card, Column, Modal, ModalActions, PageHeader, StatCard, StatusBadge, Table, buttonClass,
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
    { key: 'employeeId', label: 'ID', sortable: true },
    { key: 'user.firstName', label: 'Name', sortable: true, render: (e) => `${e.user.firstName} ${e.user.lastName}` },
    { key: 'user.email', label: 'Email', sortable: true },
    { key: 'position', label: 'Position', sortable: true },
    { key: 'user.department', label: 'Department', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (e) => <StatusBadge status={e.status} /> },
  ];
  if (isAdmin) {
    columns.push({
      key: 'id',
      label: 'Actions',
      render: (e) => (
        <div className="flex items-center gap-2">
          <Link href={`/employees/${e.id}/edit`} className="p-1 text-moss-600 hover:bg-moss-50 rounded" title="Edit">
            <Edit2 size={18} />
          </Link>
          {e.status !== 'INACTIVE' && (
            <button
              type="button"
              onClick={() => {
                setDeactivateError(null);
                setDeactivating(e);
              }}
              className="p-1 text-red-600 hover:bg-red-50 rounded"
              title="Deactivate"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      ),
    });
  }

  return (
    <>
      <PageHeader
        eyebrow="Team Management"
        title="Team Members"
        description={`${employees.length} employees across ${departments} departments`}
        action={
          isAdmin && (
            <Link href="/employees/add" className={buttonClass('primary', 'lg')}>
              <Plus size={24} />
              Add Employee
            </Link>
          )
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Total Employees" value={employees.length} icon={<Users size={24} />} />
        <StatCard
          label="Active"
          value={employees.filter((e) => e.status === 'ACTIVE').length}
          icon={<Users size={24} />}
          tone="emerald"
        />
        <StatCard label="Departments" value={departments} icon={<Building size={24} />} tone="blue" />
      </div>

      <Card title="Employee Directory">
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

      <Modal isOpen={!!deactivating} onClose={() => setDeactivating(null)} title="Deactivate Employee">
        <div className="space-y-4">
          <Alert>{deactivateError}</Alert>
          <p className="text-moss-700">
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
