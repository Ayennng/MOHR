'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, Users, Calendar, TrendingUp, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReportData {
  period: string;
  metrics: {
    totalEmployees: number;
    newHires: number;
    avgAttendance: number;
    pendingLeaves: number;
    departmentCount: number;
  };
  departmentStats: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
  weeklyTrend: Array<{
    day: string;
    rate: number;
  }>;
  leaveStats: {
    approved: number;
    pending: number;
    rejected: number;
    cancelled: number;
  };
}

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, [selectedPeriod]);

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/reports?period=${selectedPeriod}`);
      if (!response.ok) throw new Error(`Reports request failed (${response.status})`);
      setReportData(await response.json());
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDepartmentColor = (index: number) => {
    const colors = [
      'from-moss-500 to-moss-600',
      'from-blue-500 to-blue-600',
      'from-amber-500 to-amber-600',
      'from-green-500 to-green-600',
      'from-red-500 to-red-600',
      'from-purple-500 to-purple-600',
    ];
    return colors[index % colors.length];
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-moss-600 mx-auto"></div>
          <p className="mt-4 text-moss-600">Loading report data...</p>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <p className="text-moss-600">Failed to load report data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header - Enhanced */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-8 rounded-3xl bg-gradient-to-br from-moss-50 to-emerald-50 border-2 border-moss-100">
        <div className="flex-1">
          <div className="inline-block px-4 py-2 bg-moss-600 text-white rounded-full text-xs font-bold mb-3">
            ANALYTICS DASHBOARD
          </div>
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-moss-900 to-moss-700 bg-clip-text text-transparent mb-3 pb-2">
            Reports & Analytics
          </h1>
          <p className="text-moss-800 text-lg">View detailed HR metrics and insights</p>
        </div>
        <button className="px-8 py-4 bg-gradient-to-r from-moss-500 to-moss-600 text-white rounded-2xl font-bold text-lg hover:from-moss-600 hover:to-moss-700 transition-all shadow-xl hover:shadow-2xl hover:scale-105 flex items-center gap-3">
          <Download size={24} />
          Export Report
        </button>
      </div>

      {/* Period Selector - Enhanced */}
      <div className="bg-white rounded-2xl border-2 border-moss-100 p-2 shadow-lg inline-flex gap-2">
        {[
          { value: 'week', label: 'This Week' },
          { value: 'month', label: 'This Month' },
          { value: 'quarter', label: 'This Quarter' },
          { value: 'year', label: 'This Year' }
        ].map((period) => (
          <button
            key={period.value}
            onClick={() => setSelectedPeriod(period.value)}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
              selectedPeriod === period.value
                ? 'bg-gradient-to-r from-moss-500 to-moss-600 text-white shadow-md'
                : 'text-moss-700 hover:bg-moss-50'
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>

      {/* Key Metrics - Enhanced Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Employees */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm hover:shadow-lg transition-all border border-moss-100">
          <div className="absolute inset-0 bg-gradient-to-br from-moss-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-moss-100 to-moss-200 rounded-xl group-hover:scale-110 transition-transform">
                <Users className="text-moss-700" size={24} />
              </div>
              {reportData.metrics.newHires > 0 && (
                <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                  ↑ +{reportData.metrics.newHires}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-moss-800 uppercase tracking-wide">Total Employees</p>
            <p className="text-4xl font-bold text-moss-900 mt-2">{reportData.metrics.totalEmployees}</p>
            <p className="text-xs text-green-600 font-medium mt-2">
              {reportData.metrics.newHires > 0 
                ? `${reportData.metrics.newHires} new hires this ${selectedPeriod}`
                : 'No new hires this period'}
            </p>
          </div>
        </div>

        {/* Average Attendance */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm hover:shadow-lg transition-all border border-emerald-100">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl group-hover:scale-110 transition-transform">
                <TrendingUp className="text-emerald-600" size={24} />
              </div>
              {reportData.metrics.avgAttendance >= 95 && (
                <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">✓</span>
              )}
            </div>
            <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wide">Avg Attendance</p>
            <p className="text-4xl font-bold text-emerald-900 mt-2">{reportData.metrics.avgAttendance}%</p>
            <p className="text-xs text-emerald-600 font-medium mt-2">
              {reportData.metrics.avgAttendance >= 95 
                ? 'Excellent performance'
                : reportData.metrics.avgAttendance >= 85
                ? 'Good performance'
                : 'Needs improvement'}
            </p>
          </div>
        </div>

        {/* Pending Leaves */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm hover:shadow-lg transition-all border border-amber-100">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl group-hover:scale-110 transition-transform">
                <Calendar className="text-amber-600" size={24} />
              </div>
              {reportData.metrics.pendingLeaves > 0 && (
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full">⚠ Pending</span>
              )}
            </div>
            <p className="text-sm font-semibold text-amber-600 uppercase tracking-wide">Pending Leaves</p>
            <p className="text-4xl font-bold text-amber-900 mt-2">{reportData.metrics.pendingLeaves}</p>
            <p className="text-xs text-amber-600 font-medium mt-2">
              {reportData.metrics.pendingLeaves > 0 ? 'Awaiting approval' : 'All caught up!'}
            </p>
          </div>
        </div>

        {/* Departments */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm hover:shadow-lg transition-all border border-blue-100">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl group-hover:scale-110 transition-transform">
                <BarChart3 className="text-blue-600" size={24} />
              </div>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Org</span>
            </div>
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide">Departments</p>
            <p className="text-4xl font-bold text-blue-900 mt-2">{reportData.metrics.departmentCount}</p>
            <p className="text-xs text-blue-600 font-medium mt-2">Active departments</p>
          </div>
        </div>
      </div>

      {/* Charts Section - Department & Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employee Distribution */}
        <div className="bg-white rounded-2xl border border-moss-100 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-moss-900 mb-6">Employees by Department</h2>
          {reportData.departmentStats.length === 0 ? (
            <p className="text-center py-8 text-moss-600">No department data available</p>
          ) : (
            <div className="space-y-4">
              {reportData.departmentStats.map((dept, index) => (
                <div key={dept.name}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-moss-900">{dept.name}</span>
                    <span className="text-sm bg-moss-100 text-moss-900 px-3 py-1 rounded-full font-bold border border-moss-200">
                      {dept.count}
                    </span>
                  </div>
                  <div className="w-full bg-moss-100 rounded-full h-3 overflow-hidden">
                    <div
                      className={`bg-gradient-to-r ${getDepartmentColor(index)} h-3 rounded-full transition-all`}
                      style={{ width: `${dept.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Attendance Trend */}
        <div className="bg-white rounded-2xl border border-moss-100 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-moss-900 mb-6">Weekly Attendance Trend</h2>
          {reportData.weeklyTrend.length === 0 ? (
            <p className="text-center py-8 text-moss-600">No attendance data available</p>
          ) : (
            <div className="space-y-4">
              {reportData.weeklyTrend.map((item) => (
                <div key={item.day}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-moss-900">{item.day}</span>
                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                      item.rate >= 96 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {item.rate}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                      className={`bg-gradient-to-r ${
                        item.rate >= 96 ? 'from-green-500 to-green-600' : 'from-amber-500 to-amber-600'
                      } h-3 rounded-full transition-all`}
                      style={{ width: `${item.rate}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Leave Statistics - Modern Card Grid */}
      <div className="bg-white rounded-2xl border border-moss-100 p-8 shadow-sm">
        <h2 className="text-xl font-bold text-moss-900 mb-6">Leave Request Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Approved', value: reportData.leaveStats.approved, bg: 'from-green-50', text: 'text-green-600', badge: '✓' },
            { label: 'Pending', value: reportData.leaveStats.pending, bg: 'from-amber-50', text: 'text-amber-600', badge: '⏳' },
            { label: 'Rejected', value: reportData.leaveStats.rejected, bg: 'from-red-50', text: 'text-red-600', badge: '✗' },
            { label: 'Cancelled', value: reportData.leaveStats.cancelled, bg: 'from-blue-50', text: 'text-blue-600', badge: '↩' },
          ].map((stat) => (
            <div key={stat.label} className={`bg-gradient-to-br ${stat.bg} to-transparent rounded-xl p-6 border border-opacity-20 hover:shadow-md transition-all`}>
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{stat.badge}</span>
                <p className={`text-xs font-semibold uppercase tracking-wide ${stat.text}`}>{stat.label}</p>
              </div>
              <p className={`text-3xl font-bold ${stat.text} mt-2`}>{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
