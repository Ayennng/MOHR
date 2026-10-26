'use client';

import { InputHTMLAttributes, ReactNode, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function FormField({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="form-group">
      <label className="form-label">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && <div className="form-error">{error}</div>}
    </div>
  );
}

/** Password input with a show/hide toggle. */
export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-input-wrapper">
      <input {...props} type={visible ? 'text' : 'password'} className="form-input" />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="password-toggle"
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <Eye size={18} /> : <EyeOff size={18} />}
      </button>
    </div>
  );
}
