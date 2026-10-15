'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Heart, User, Info } from 'lucide-react';
import Link from 'next/link';
import { LeaveForm } from '@/components/leave/leave-form';

interface LeaveBalance {
  vacationDays: { total: number; used: number; available: number };
  sickDays: { total: number; used: number; available: number };
  personalDays: { total: number; used: number; available: number };
  pendingRequests: number;
}

// Decorative header pattern. Set inline rather than as a Tailwind arbitrary background class: Turbopack
// (Next 16.4) tries to resolve data: URLs found in generated CSS as files and fails the build.
const HEADER_PATTERN = "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzMiAyIDIgNHYyYzAgMi0yIDQtMiA0cy0yLTItMi00di0yem0wLTMwYzAtMiAyLTQgMi00czIgMiAyIDR2MmMwIDItMiA0LTIgNHMtMi0yLTItNFY0eiIvPjwvZz48L2c+PC9zdmc+')";

export default function RequestLeavePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleBackToLeave = () => router.push('/leave');

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const response = await fetch('/api/leave/balance');
        if (!response.ok) throw new Error(`Leave balance request failed (${response.status})`);
        setLeaveBalance(await response.json());
      } catch (error) {
        console.error('Failed to fetch leave balance:', error);
      }
    };

    fetchBalance();
  }, []);

  const handleSubmit = async (data: any) => {
    try {
      setIsLoading(true);
      
      // Create FormData to handle file upload
      const formData = new FormData();
      formData.append('leaveType', data.leaveType);
      formData.append('startDate', data.startDate);
      formData.append('endDate', data.endDate);
      formData.append('reason', data.reason);
      
      if (data.attachment) {
        formData.append('attachment', data.attachment);
      }

      // Don't set Content-Type header - let browser set it with boundary
      const response = await fetch('/api/leave', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to submit leave request');
      }

      setShowSuccess(true);
      // Reset form would go here if needed
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div>
        {/* Header with gradient background */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-moss-600 to-moss-800 p-8 mb-8 shadow-xl">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: HEADER_PATTERN }}></div>
          <div className="relative flex items-start justify-between">
            <div>
              <button
                onClick={handleBackToLeave}
                className="inline-flex items-center gap-2 px-4 py-2 mb-4 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-all border border-white/20 hover:border-white/30 backdrop-blur-sm cursor-pointer"
              >
                <ArrowLeft size={16} />
                Back to Leave Management
              </button>
              <h1 className="text-4xl font-extrabold text-white mb-2">Request Leave</h1>
              <p className="text-moss-100 text-lg">Submit a new leave request for approval</p>
            </div>
            <div className="px-5 py-2 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold text-white">
              EMPLOYEE PORTAL
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section - Takes 2 columns */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg border-2 border-moss-100 overflow-hidden">
              <div className="bg-gradient-to-r from-moss-600 to-moss-700 px-8 py-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-8 bg-white rounded-full"></span>
                  Leave Request Form
                </h2>
              </div>
              <div className="p-8">
                {showSuccess ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
                      <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-moss-900 mb-3">Request Submitted!</h3>
                    <p className="text-moss-600 mb-8">
                      Your leave request has been submitted successfully and is pending approval.
                    </p>
                    <div className="flex gap-4 justify-center">
                      <button
                        onClick={() => setShowSuccess(false)}
                        className="px-6 py-3 bg-moss-600 text-white rounded-lg font-medium hover:bg-moss-700 transition-colors"
                      >
                        Submit Another Request
                      </button>
                      <button
                        onClick={handleBackToLeave}
                        className="px-6 py-3 bg-white border-2 border-moss-600 text-moss-600 rounded-lg font-medium hover:bg-moss-50 transition-colors"
                      >
                        View All Requests
                      </button>
                    </div>
                  </div>
                ) : (
                  <LeaveForm
                    onSubmit={handleSubmit}
                    isLoading={isLoading}
                    submitText="Submit Request"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Takes 1 column */}
          <div className="space-y-6">
            {/* Leave Balance Card */}
            <div className="bg-white rounded-2xl shadow-lg border-2 border-moss-100 overflow-hidden">
              <div className="bg-gradient-to-r from-moss-600 to-moss-700 px-6 py-5">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                  <Calendar className="text-white" size={24} />
                  Your Balance
                </h3>
              </div>
              <div className="p-6 space-y-5">
                {/* Vacation Days */}
                <div className="group">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-moss-100 flex items-center justify-center">
                        <Calendar className="text-moss-600" size={20} />
                      </div>
                      <span className="text-sm font-semibold text-moss-700 uppercase tracking-wide">Vacation Days</span>
                    </div>
                    <span className="text-lg font-bold text-moss-900 bg-moss-100 px-3 py-1 rounded-full">
                      {leaveBalance?.vacationDays.available || 0}/{leaveBalance?.vacationDays.total || 0}
                    </span>
                  </div>
                  <div className="w-full bg-moss-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-moss-500 to-moss-600 h-3 rounded-full transition-all duration-500 ease-out group-hover:from-moss-600 group-hover:to-moss-700"
                      style={{ width: `${leaveBalance ? (leaveBalance.vacationDays.available / leaveBalance.vacationDays.total * 100) : 0}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-moss-600 mt-1.5 font-medium">
                    {leaveBalance ? Math.round(leaveBalance.vacationDays.available / leaveBalance.vacationDays.total * 100) : 0}% available
                  </p>
                </div>

                {/* Sick Days */}
                <div className="group">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                        <Heart className="text-red-600" size={20} />
                      </div>
                      <span className="text-sm font-semibold text-red-700 uppercase tracking-wide">Sick Days</span>
                    </div>
                    <span className="text-lg font-bold text-red-900 bg-red-100 px-3 py-1 rounded-full">
                      {leaveBalance?.sickDays.available || 0}/{leaveBalance?.sickDays.total || 0}
                    </span>
                  </div>
                  <div className="w-full bg-red-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full transition-all duration-500 ease-out group-hover:from-red-600 group-hover:to-red-700"
                      style={{ width: `${leaveBalance ? (leaveBalance.sickDays.available / leaveBalance.sickDays.total * 100) : 0}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-red-600 mt-1.5 font-medium">
                    {leaveBalance ? Math.round(leaveBalance.sickDays.available / leaveBalance.sickDays.total * 100) : 0}% available
                  </p>
                </div>

                {/* Personal Days */}
                <div className="group">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                        <User className="text-amber-600" size={20} />
                      </div>
                      <span className="text-sm font-semibold text-amber-700 uppercase tracking-wide">Personal Days</span>
                    </div>
                    <span className="text-lg font-bold text-amber-900 bg-amber-100 px-3 py-1 rounded-full">
                      {leaveBalance?.personalDays.available || 0}/{leaveBalance?.personalDays.total || 0}
                    </span>
                  </div>
                  <div className="w-full bg-amber-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-amber-600 h-3 rounded-full transition-all duration-500 ease-out group-hover:from-amber-600 group-hover:to-amber-700"
                      style={{ width: `${leaveBalance ? (leaveBalance.personalDays.available / leaveBalance.personalDays.total * 100) : 0}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-amber-600 mt-1.5 font-medium">
                    {leaveBalance ? Math.round(leaveBalance.personalDays.available / leaveBalance.personalDays.total * 100) : 0}% available
                  </p>
                </div>
              </div>
            </div>

            {/* Guidelines Card */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg border-2 border-blue-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                  <Info className="text-white" size={24} />
                  Guidelines
                </h3>
              </div>
              <div className="p-6">
                <ul className="space-y-4">
                  <li className="flex items-start gap-3 group">
                    <div className="mt-0.5 w-2 h-2 bg-blue-600 rounded-full group-hover:scale-125 transition-transform"></div>
                    <p className="text-sm text-blue-900 font-medium leading-relaxed">Submit requests at least <strong>2 weeks in advance</strong></p>
                  </li>
                  <li className="flex items-start gap-3 group">
                    <div className="mt-0.5 w-2 h-2 bg-blue-600 rounded-full group-hover:scale-125 transition-transform"></div>
                    <p className="text-sm text-blue-900 font-medium leading-relaxed">Manager approval <strong>required</strong> for all leaves</p>
                  </li>
                  <li className="flex items-start gap-3 group">
                    <div className="mt-0.5 w-2 h-2 bg-blue-600 rounded-full group-hover:scale-125 transition-transform"></div>
                    <p className="text-sm text-blue-900 font-medium leading-relaxed">Maximum <strong>3 consecutive days</strong> without prior approval</p>
                  </li>
                  <li className="flex items-start gap-3 group">
                    <div className="mt-0.5 w-2 h-2 bg-blue-600 rounded-full group-hover:scale-125 transition-transform"></div>
                    <p className="text-sm text-blue-900 font-medium leading-relaxed">Update your status once <strong>approved</strong></p>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
