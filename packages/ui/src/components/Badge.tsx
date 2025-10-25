import React from 'react';
import { cn } from '../utils/cn';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  children,
  className,
}) => {
  const baseClasses = `
    inline-flex items-center font-medium rounded-full
    transition-all duration-200
  `;

  const variants = {
    default: 'bg-dark-700/50 text-gray-300 border border-dark-600/30',
    success: 'bg-primary-500/20 text-primary-400 border border-primary-500/30',
    warning: 'bg-secondary-500/20 text-secondary-400 border border-secondary-500/30',
    error: 'bg-accent-500/20 text-accent-400 border border-accent-500/30',
  };

  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span
      className={cn(
        baseClasses,
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
};