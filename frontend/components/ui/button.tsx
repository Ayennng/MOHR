import React from 'react';
import { Spinner } from './spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'success' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-linear-to-r from-moss-500 to-moss-600 text-white shadow-sm hover:from-moss-600 hover:to-moss-700 disabled:opacity-60',
  secondary: 'bg-moss-100 text-moss-800 hover:bg-moss-200 disabled:opacity-60',
  outline: 'border-2 border-moss-500 text-moss-700 hover:bg-moss-50 disabled:opacity-50',
  success: 'bg-green-600 text-white hover:bg-green-700 disabled:opacity-60',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-60',
  ghost: 'text-moss-700 hover:bg-moss-50 disabled:opacity-50',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-lg',
  lg: 'px-7 py-3.5 text-base font-bold rounded-2xl shadow-lg hover:shadow-xl',
};

/** Button classes, for links that look like buttons. */
export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className = '') {
  return `inline-flex items-center justify-center gap-2 font-semibold transition-all disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading,
  disabled,
  className,
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  return (
    <button type={type} disabled={disabled || isLoading} className={buttonClass(variant, size, className)} {...props}>
      {isLoading && <Spinner size="sm" />}
      {children}
    </button>
  );
}
