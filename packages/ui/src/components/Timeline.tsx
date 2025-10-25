import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  type?: 'success' | 'warning' | 'error' | 'info';
  icon?: React.ReactNode;
}

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

export const Timeline: React.FC<TimelineProps> = ({ items, className }) => {
  const typeColors = {
    success: 'bg-primary-500 border-primary-500/30',
    warning: 'bg-secondary-500 border-secondary-500/30',
    error: 'bg-accent-500 border-accent-500/30',
    info: 'bg-blue-500 border-blue-500/30',
  };

  return (
    <div className={cn('space-y-6', className)}>
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="relative flex gap-4"
        >
          {/* Timeline line */}
          {index < items.length - 1 && (
            <div className="absolute left-4 top-8 w-px h-full bg-dark-600/50" />
          )}
          
          {/* Icon */}
          <div
            className={cn(
              'flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center',
              typeColors[item.type || 'info']
            )}
          >
            {item.icon || <div className="w-3 h-3 rounded-full bg-current" />}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-white">{item.title}</h4>
            {item.description && (
              <p className="text-gray-400 text-sm mt-1">{item.description}</p>
            )}
            <p className="text-gray-500 text-xs mt-2">
              {new Date(item.timestamp).toLocaleString('fr')}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};