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
        back={{ href: '/leave', label: 'Leave' }}
        title="Request leave"
        description="A manager or admin approves it, and you see the decision under Leave"
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <Card title="Your request" className="lg:col-span-2">
          {submitted ? (
            <div className="py-12 text-center">
              <div className="mb-5 inline-grid size-12 place-items-center rounded-full bg-mint-200 text-mint-900 animate-pop">
                <Check size={22} />
              </div>
              <h3 className="text-lg font-semibold text-ink-900">Request submitted</h3>
              <p className="mt-1 mb-6 text-[15px] text-ink-600">It is waiting for approval.</p>
              <div className="flex justify-center gap-2">
                <Button
                  onClick={() => {
                    setSubmitted(false);
                    setFormKey((k) => k + 1);
                  }}
                >
                  Submit another
                </Button>
                <Link href="/leave" className={buttonClass('outline')}>
                  View requests
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
            <ul className="space-y-3 text-sm text-ink-600">
              {RULES.map((rule) => (
                <li key={rule} className="flex gap-3">
                  <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-ink-400" />
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
