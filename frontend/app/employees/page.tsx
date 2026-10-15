'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Plus, Edit2, Trash2, Users } from 'lucide-react';
import { Table, Column, Button, Dialog, Badge } from '@/components/ui';

interface Employee {
  id: string;
  employeeId: string;
  position: string;
  hireDate: string;
  status: string;
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
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    employee: Employee | null;
  }>({ isOpen: false, employee: null });
  const [sortColumn, setSortColumn] = useState<string>('user.firstName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Fetch employees
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/employees');
        const data = await response.json();
        setEmployees(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to fetch employees:', error);
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  // Sort employees
  const sortedEmployees = [...employees].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    // Handle nested properties
    if (sortColumn.startsWith('user.')) {
      const key = sortColumn.split('.')[1] as keyof Employee['user'];
      aValue = a.user[key] || '';
      bValue = b.user[key] || '';
    } else {
      aValue = a[sortColumn as keyof Employee];
      bValue = b[sortColumn as keyof Employee];
    }

    if (typeof aValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(String(bValue))
        : String(bValue).localeCompare(aValue);
    }
    return sortDirection === 'asc'
      ? Number(aValue) - Number(bValue)
      : Number(bValue) - Number(aValue);
  });

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.employee) return;

    const deactivatedId = deleteDialog.employee.id;
    try {
      const response = await fetch(`/api/employees/${encodeURIComponent(deactivatedId)}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to deactivate employee');
      }
      // Soft delete: the record stays, marked INACTIVE
      setEmployees((prev) =>
        prev.map((e) => (e.id === deactivatedId ? { ...e, status: 'INACTIVE' } : e))
      );
      setDeleteDialog({ isOpen: false, employee: null });
    } catch (error) {
      console.error('Failed to deactivate employee:', error);
      alert(error instanceof Error ? error.message : 'Failed to deactivate employee');
    }
  };

  // Only admins can add, edit or deactivate employees (enforced by the backend too)
  const isAdmin = session?.user?.role === 'ADMIN';
  const canEdit = isAdmin;

  const actionsColumn: Column<Employee> = {
    key: 'id',
    label: 'Actions',
    render: (value, row) => (
      <div className="flex items-center gap-2">
        <Link
          href={`/employees/${value}/edit`}
          className="p-1 text-moss-600 hover:bg-moss-50 rounded transition-colors"
          title="Edit"
        >
          <Edit2 size={18} />
        </Link>
        {row.status !== 'INACTIVE' && (
          <button
            onClick={() => setDeleteDialog({ isOpen: true, employee: row })}
            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Deactivate"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
    ),
  };

  const columns: Column<Employee>[] = [
    {
      key: 'user.firstName',
      label: 'Name',
      sortable: true,
      render: (value, row) => `${row.user.firstName} ${row.user.lastName}`,
    },
    {
      key: 'user.email',
      label: 'Email',
      sortable: true,
      render: (value, row) => row.user.email,
    },
    {
      key: 'position',
      label: 'Position',
      sortable: true,
    },
    {
      key: 'user.department',
      label: 'Department',
      sortable: true,
      render: (value, row) => row.user.department || '-',
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <Badge variant="info" size="sm">
          {value}
        </Badge>
      ),
    },
    ...(isAdmin ? [actionsColumn] : []),
  ];

  return (
    <div className="space-y-8">
      {/* Header - Enhanced */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-8 rounded-3xl bg-linear-to-br from-moss-50 to-emerald-50 border-2 border-moss-100">
        <div className="flex-1">
          <div className="inline-block px-4 py-2 bg-moss-600 text-white rounded-full text-xs font-bold mb-3">
            TEAM MANAGEMENT
          </div>
          <h1 className="text-5xl font-extrabold bg-linear-to-r from-moss-900 to-moss-700 bg-clip-text text-transparent mb-3 pb-2">
            Team Members
          </h1>
          <p className="text-moss-600 text-lg">
            Manage {employees.length} employees across {new Set(employees.map(e => e.user.department).filter(Boolean)).size} departments
          </p>
        </div>
        {canEdit && (
          <Link href="/employees/add">
            <button className="px-8 py-4 bg-linear-to-r from-moss-500 to-moss-600 text-white rounded-2xl font-bold text-lg hover:from-moss-600 hover:to-moss-700 transition-all shadow-xl hover:shadow-2xl hover:scale-[1.02] flex items-center gap-3">
              <Plus size={24} />
              Add Employee
            </button>
          </Link>
        )}
      </div>

      {/* Stats Row - Enhanced */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="group relative overflow-hidden bg-white rounded-2xl border-2 border-moss-100 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.01]">
          <div className="absolute inset-0 bg-linear-to-br from-moss-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-moss-600 uppercase tracking-wider mb-2">Total Employees</p>
              <p className="text-5xl font-extrabold text-moss-900">{employees.length}</p>
            </div>
            <div className="p-4 bg-linear-to-br from-moss-100 to-moss-200 rounded-2xl group-hover:scale-105 transition-transform">
              <Users size={32} className="text-moss-600" />
            </div>
          </div>
        </div>
        <div className="group relative overflow-hidden bg-white rounded-2xl border-2 border-emerald-100 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.01]">
          <div className="absolute inset-0 bg-linear-to-br from-emerald-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Active</p>
              <p className="text-5xl font-extrabold text-emerald-900">{employees.filter(e => e.status === 'ACTIVE').length}</p>
            </div>
            <div className="p-4 bg-linear-to-br from-emerald-100 to-emerald-200 rounded-2xl group-hover:scale-105 transition-transform">
              <Users size={32} className="text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="group relative overflow-hidden bg-white rounded-2xl border-2 border-blue-100 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.01]">
          <div className="absolute inset-0 bg-linear-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Departments</p>
              <p className="text-5xl font-extrabold text-blue-900">{new Set(employees.map(e => e.user.department).filter(Boolean)).size}</p>
            </div>
            <div className="p-4 bg-linear-to-br from-blue-100 to-blue-200 rounded-2xl group-hover:scale-105 transition-transform">
              <Users size={32} className="text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Table - Enhanced */}
      <div className="bg-white rounded-3xl border-2 border-moss-100 p-8 shadow-xl overflow-hidden">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-3xl font-extrabold text-moss-900 flex items-center gap-3">
            <span className="w-2 h-8 bg-linear-to-b from-moss-500 to-moss-700 rounded-full"></span>
            Employee Directory
          </h2>
          <div className="flex items-center gap-2 text-sm text-moss-600">
            <span>Sorted by</span>
            <span className="font-bold text-moss-900 bg-moss-100 px-4 py-2 rounded-xl">
              {sortColumn === 'user.firstName' ? 'Name' : sortColumn.split('.').pop()}
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table<Employee>
            columns={columns}
            data={sortedEmployees}
            loading={loading}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
        </div>
      </div>

      {/* Delete Dialog */}
      <Dialog
        isOpen={deleteDialog.isOpen}
        type="error"
        title="Deactivate Employee"
        message={`Deactivate ${deleteDialog.employee?.user.firstName} ${deleteDialog.employee?.user.lastName}? They will no longer be able to sign in. Their leave and attendance history is kept, and you can reactivate them from Edit.`}
        confirmText="Deactivate"
        cancelText="Cancel"
        isDangerous
        onClose={() => setDeleteDialog({ isOpen: false, employee: null })}
        onConfirm={handleDelete}
      />
    </div>
  );
}
