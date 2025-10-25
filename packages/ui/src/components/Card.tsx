import React from 'react';
import { cn } from '../utils/cn';

interface CardProps {
  className?: string;
  children: React.ReactNode;
  hover?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  className,
  children,
  hover = false,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'rounded-lg shadow-md',
    md: 'rounded-xl shadow-lg',
    lg: 'rounded-2xl shadow-xl'
  };

  return (
    <div
      className={cn(
        `
        bg-dark-800/40 backdrop-blur-md border border-dark-600/30
        transition-all duration-300 ease-out
        overflow-hidden
        w-full
        `,
        sizeClasses[size],
        hover && `
          hover:shadow-xl hover:shadow-primary-500/10
          hover:border-primary-500/20
          hover:transform hover:scale-[1.02] sm:hover:scale-105
        `,
        className
      )}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ 
  children: React.ReactNode; 
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({
  children,
  className,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'p-3 sm:p-4 pb-0',
    md: 'p-4 sm:p-6 pb-0',
    lg: 'p-6 sm:p-8 pb-0'
  };

  return (
    <div className={cn(
      'border-b border-dark-600/20 last:border-b-0',
      sizeClasses[size], 
      className
    )}>
      <div className="break-words overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export const CardContent: React.FC<{ 
  children: React.ReactNode; 
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  scrollable?: boolean;
}> = ({
  children,
  className,
  size = 'md',
  scrollable = false
}) => {
  const sizeClasses = {
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8'
  };

  return (
    <div className={cn(
      'flex-1',
      sizeClasses[size],
      scrollable && 'overflow-y-auto max-h-96',
      className
    )}>
      <div className="break-words overflow-hidden hyphens-auto">
        {children}
      </div>
    </div>
  );
};

export const CardFooter: React.FC<{ 
  children: React.ReactNode; 
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({
  children,
  className,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'p-3 sm:p-4 pt-0',
    md: 'p-4 sm:p-6 pt-0',
    lg: 'p-6 sm:p-8 pt-0'
  };

  return (
    <div className={cn(
      'border-t border-dark-600/20 mt-auto',
      sizeClasses[size], 
      className
    )}>
      <div className="break-words overflow-hidden">
        {children}
      </div>
    </div>
  );
};

// Composants utilitaires pour des cas spécifiques
export const CardTitle: React.FC<{ 
  children: React.ReactNode; 
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}> = ({
  children,
  className,
  as: Component = 'h3'
}) => (
  <Component className={cn(
    'font-semibold text-white mb-2',
    'text-base sm:text-lg md:text-xl',
    'leading-tight',
    'truncate',
    className
  )}>
    {children}
  </Component>
);

export const CardDescription: React.FC<{ 
  children: React.ReactNode; 
  className?: string;
  lines?: number;
}> = ({
  children,
  className,
  lines = 3
}) => (
  <p className={cn(
    'text-gray-400',
    'text-sm sm:text-base',
    'leading-relaxed',
    'break-words',
    lines === 1 && 'truncate',
    lines === 2 && 'line-clamp-2',
    lines === 3 && 'line-clamp-3',
    lines > 3 && `line-clamp-${lines}`,
    className
  )}>
    {children}
  </p>
);

// Composant pour les actions de carte (boutons, etc.)
export const CardActions: React.FC<{ 
  children: React.ReactNode; 
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}> = ({
  children,
  className,
  orientation = 'horizontal'
}) => (
  <div className={cn(
    'flex gap-2 sm:gap-3',
    orientation === 'horizontal' ? 'flex-row flex-wrap' : 'flex-col',
    'mt-4',
    className
  )}>
    {children}
  </div>
);

// Wrapper pour les grilles de cartes
export const CardGrid: React.FC<{ 
  children: React.ReactNode; 
  className?: string;
  cols?: 1 | 2 | 3 | 4;
}> = ({
  children,
  className,
  cols = 3
}) => {
  const colsClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
  };

  return (
    <div className={cn(
      'grid gap-4 sm:gap-6',
      colsClasses[cols],
      className
    )}>
      {children}
    </div>
  );
};