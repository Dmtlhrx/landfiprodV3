import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, XCircle, Info, X } from 'lucide-react';
import { cn } from '../utils/cn';

interface ToastProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  type,
  title,
  message,
  onClose,
  duration = 4000,
}) => {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
  };

  const colors = {
    success: 'border-primary-500/30 bg-primary-500/10 text-primary-400',
    error: 'border-accent-500/30 bg-accent-500/10 text-accent-400',
    warning: 'border-secondary-500/30 bg-secondary-500/10 text-secondary-400',
    info: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  };

  const Icon = icons[type];

  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.8 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md shadow-lg max-w-sm',
        colors[type]
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
      
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-white">{title}</h4>
        {message && (
          <p className="text-sm text-gray-300 mt-1">{message}</p>
        )}
      </div>
      
      <button
        onClick={onClose}
        className="p-1 text-gray-400 hover:text-white transition-colors rounded"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
};