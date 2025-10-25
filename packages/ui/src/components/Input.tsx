import React from 'react';
import { cn } from '../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'glass';
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  variant = 'default',
  className,
  ...props
}) => {
  const variants = {
    default: 'bg-dark-700/30 border-dark-600/30 focus:border-primary-500',
    glass: 'glass border-dark-600/30 focus:border-primary-500',
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-300">
          {label}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        
        <input
          className={cn(
            `
            w-full px-4 py-3 rounded-xl text-white placeholder-gray-400
            border transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-primary-500/50
            disabled:opacity-50 disabled:cursor-not-allowed
            `,
            icon && 'pl-12',
            variants[variant],
            error && 'border-accent-500 focus:border-accent-500',
            className
          )}
          {...props}
        />
      </div>
      
      {error && (
        <p className="text-accent-400 text-sm">{error}</p>
      )}
    </div>
  );
};