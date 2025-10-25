import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../utils/cn';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-6',
        className
      )}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', damping: 15 }}
        className="p-4 bg-dark-700/30 rounded-full mb-6"
      >
        <Icon className="h-12 w-12 text-gray-500" />
      </motion.div>
      
      <h3 className="font-heading text-xl font-semibold text-white mb-2">
        {title}
      </h3>
      
      <p className="text-gray-400 max-w-md mb-6">
        {description}
      </p>
      
      {action && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Button onClick={action.onClick}>
            {action.label}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};