'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { api } from '@/lib/api';
import { LeaveForm } from '@/components/leave/leave-form';
import { LeaveBalanceCards } from '@/components/leave/leave-balance';
import { Button, Card, PageHeader, buttonClass } from '@/components/ui';

// What the backend actually enforces (POST /api/leave and the approval route)
const RULES = [
  'Only working days (Monday to Friday) count against your balance',
  'You can request leave starting up to 30 days ago, for up to a year',
  "Requests can't overlap your other pending or approved leave",
  'A manager or admin approves or rejects each request',
];

export default function RequestLeavePage() {
  const [submitted, setSubmitted] = useState(false);
  // Remounting the form clears it for "Submit another"
  const [formKey, setFormKey] = useState(0);

  const handleSubmit = async (formData: FormData) => {
    await api('/api/leave', { method: 'POST', body: formData });
    setSubmitted(true);
  };

  return (
    <>
      <PageHeader
        back={{ href: '/leave', label: 'Back to Leave Management' }}
        title="Request Leave"
        description="Submit a new leave request for approval"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card title="Leave Request Form" className="lg:col-span-2">
          {submitted ? (
            <div className="text-center py-12">
              <div className="mb-6 inline-grid size-20 place-items-center rounded-full bg-mint-200 text-mint-900 animate-pop">
                <Check size={40} />
              </div>
              <h3 className="text-2xl font-bold text-mint-900 mb-3">Request Submitted!</h3>
              <p className="text-mint-700 mb-8">Your leave request is pending approval.</p>
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => {
                    setSubmitted(false);
                    setFormKey((k) => k + 1);
                  }}
                >
                  Submit Another Request
                </Button>
                <Link href="/leave" className={buttonClass('outline')}>
                  View All Requests
                </Link>
              </div>
            </div>
          ) : (
            <LeaveForm key={formKey} onSubmit={handleSubmit} />
          )}
        </Card>

        <div className="space-y-6">
          <LeaveBalanceCards compact />
          <Card title="Good to know">
            <ul className="space-y-3 text-sm text-mint-800">
              {RULES.map((rule) => (
                <li key={rule} className="flex gap-3">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-mint-500" />
                  {rule}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
