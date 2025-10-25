import React from 'react';
import { cn } from '../utils/cn';

interface StatKPIProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export const StatKPI: React.FC<StatKPIProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  className,
}) => {
  return (
    <div
      className={cn(
        `
      bg-dark-800/40 backdrop-blur-md border border-dark-600/30
      rounded-xl p-6 transition-all duration-300
      hover:shadow-lg hover:shadow-primary-500/10
      hover:border-primary-500/20
      `,
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {trend && (
            <p
              className={cn(
                'text-sm font-medium mt-1',
                trend.isPositive ? 'text-primary-400' : 'text-accent-400'
              )}
            >
              {trend.isPositive ? '+' : ''}
              {trend.value}%
            </p>
          )}
        </div>
        <div className="p-3 bg-primary-500/20 rounded-lg">
          <Icon className="h-6 w-6 text-primary-400" />
        </div>
      </div>
    </div>
  );
};
