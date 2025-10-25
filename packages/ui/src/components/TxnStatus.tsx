import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, XCircle, ExternalLink } from 'lucide-react';
import { Badge } from './Badge';
import { cn } from '../utils/cn';

interface TxnStatusProps {
  status: 'pending' | 'success' | 'failed';
  transactionId?: string;
  network?: string;
  className?: string;
}

export const TxnStatus: React.FC<TxnStatusProps> = ({
  status,
  transactionId,
  network = 'testnet',
  className,
}) => {
  const statusConfig = {
    pending: {
      icon: Clock,
      color: 'text-secondary-400',
      bgColor: 'bg-secondary-500/20',
      label: 'En cours...',
      variant: 'warning' as const,
    },
    success: {
      icon: CheckCircle,
      color: 'text-primary-400',
      bgColor: 'bg-primary-500/20',
      label: 'Confirmée',
      variant: 'success' as const,
    },
    failed: {
      icon: XCircle,
      color: 'text-accent-400',
      bgColor: 'bg-accent-500/20',
      label: 'Échouée',
      variant: 'error' as const,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  const explorerUrl = network === 'mainnet' 
    ? `https://hashscan.io/mainnet/transaction/${transactionId}`
    : `https://hashscan.io/testnet/transaction/${transactionId}`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'flex items-center gap-3 p-4 rounded-lg border',
        config.bgColor,
        'border-current/20',
        className
      )}
    >
      <div className={cn('p-2 rounded-full', config.bgColor)}>
        <Icon className={cn('h-5 w-5', config.color)} />
      </div>
      
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-white">Transaction</span>
          <Badge variant={config.variant} size="sm">
            {config.label}
          </Badge>
        </div>
        
        {transactionId && (
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm font-mono">
              {transactionId.slice(0, 8)}...{transactionId.slice(-8)}
            </span>
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-400 hover:text-primary-300 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        )}
      </div>
    </motion.div>
  );
};