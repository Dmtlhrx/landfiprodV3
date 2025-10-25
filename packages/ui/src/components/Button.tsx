import React from 'react';
import { cn } from '../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  disabled,
  ...props
}) => {
  const baseClasses = `
    inline-flex items-center justify-center font-medium rounded-xl
    transition-all duration-200 ease-out
    focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-dark-950
    disabled:opacity-50 disabled:cursor-not-allowed
    transform hover:scale-102
  `;

  const variants = {
    primary: `
      bg-gradient-to-r from-primary-600 to-primary-500
      text-white shadow-lg
      hover:shadow-primary-500/25 hover:shadow-xl
      hover:from-primary-700 hover:to-primary-600
      active:scale-98
    `,
    secondary: `
      bg-gradient-to-r from-secondary-600 to-secondary-500
      text-dark-900 shadow-lg
      hover:shadow-secondary-500/25 hover:shadow-xl
      hover:from-secondary-700 hover:to-secondary-600
      active:scale-98
    `,
    outline: `
      border-2 border-primary-500/30 text-primary-400
      bg-dark-900/20 backdrop-blur-sm
      hover:border-primary-500 hover:bg-primary-500/10
      hover:shadow-primary-500/20 hover:shadow-lg
    `,
    ghost: `
      text-gray-300 hover:text-primary-400
      hover:bg-primary-500/10
    `,
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <button
      className={cn(
        baseClasses,
        variants[variant],
        sizes[size],
        isLoading && 'pointer-events-none',
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-3 h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
};