import React from 'react';
import { User } from 'lucide-react';
import { cn } from '../utils/cn';

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallback?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  size = 'md',
  className,
  fallback,
}) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-8 w-8',
  };

  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn(
          'rounded-full object-cover border-2 border-primary-500/30',
          sizes[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        `
        rounded-full bg-gradient-to-br from-primary-500 to-secondary-500
        flex items-center justify-center text-white font-semibold
        border-2 border-primary-500/30
        `,
        sizes[size],
        className
      )}
    >
      {fallback ? (
        <span className="text-sm">{fallback}</span>
      ) : (
        <User className={iconSizes[size]} />
      )}
    </div>
  );
};