import React from 'react';
import { Spinner } from './spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'success' | 'danger' | 'dangerSoft' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const variantStyles: Record<ButtonVariant, string> = {
  // Forest pill with mint text: the trademark control (mint-200 on mint-900 = 9.3:1)
  primary: 'bg-mint-900 text-mint-200 hover:bg-mint-800',
  // Mint pill, for the main action on a forest panel
  secondary: 'bg-mint-200 text-mint-950 hover:bg-mint-300',
  outline: 'border border-ink-900/12 bg-white text-ink-900 hover:border-ink-900/20 hover:bg-ink-50',
  success: 'bg-mint-700 text-white hover:bg-mint-800',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  dangerSoft: 'bg-rose-50 text-rose-800 hover:bg-rose-100',
  ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3.5 text-[13px]',
  md: 'h-10 px-4.5 text-sm',
  lg: 'h-11 px-5 text-[15px]',
};

/** Button classes, for links that look like buttons. */
export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className = '') {
  return (
    'inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap ' +
    'transition-[transform,background-color,border-color,color] duration-150 ease-out-soft ' +
    'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 ' +
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
