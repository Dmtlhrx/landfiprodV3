import React from 'react';
import { cn } from '../utils/cn';

interface NeonDividerProps {
  className?: string;
  gradient?: 'primary' | 'secondary';
}

export const NeonDivider: React.FC<NeonDividerProps> = ({
  className,
  gradient = 'primary',
}) => {
  const gradients = {
    primary: 'from-transparent via-primary-500 to-transparent',
    secondary: 'from-transparent via-secondary-500 to-transparent',
  };

  return (
    <div className={cn('relative', className)}>
      <div className={cn(
        'h-px bg-gradient-to-r',
        gradients[gradient]
      )} />
      <div className={cn(
        'absolute inset-0 h-px bg-gradient-to-r blur-sm',
        gradients[gradient]
      )} />
    </div>
  );
};