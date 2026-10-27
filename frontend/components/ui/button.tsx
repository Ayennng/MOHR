import React from 'react';
import { Spinner } from './spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'success' | 'danger' | 'dangerSoft' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const variantStyles: Record<ButtonVariant, string> = {
  // Ink pill with mint text: the app's signature control (mint-200 on mint-900 = 9.3:1)
  primary: 'bg-mint-900 text-mint-200 hover:bg-mint-800 hover:shadow-lift',
  secondary: 'bg-mint-200 text-mint-900 hover:bg-mint-300',
  outline: 'border border-mint-900/20 bg-white text-mint-900 hover:bg-mint-100 hover:border-mint-900/30',
  success: 'bg-mint-700 text-white hover:bg-mint-800',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  dangerSoft: 'bg-rose-100 text-rose-800 hover:bg-rose-200',
  ghost: 'text-mint-800 hover:bg-mint-100',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3.5 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

/** Button classes, for links that look like buttons. */
export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className = '') {
  return (
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap ' +
    'transition-[transform,background-color,border-color,box-shadow,color] duration-200 ease-out-soft ' +
    'active:scale-[0.97] active:duration-[120ms] disabled:pointer-events-none disabled:opacity-50 ' +
    `${variantStyles[variant]} ${sizeStyles[size]} ${className}`
  );
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
