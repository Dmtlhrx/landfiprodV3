import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '../utils/cn';

interface NetworkIndicatorProps {
  isConnected: boolean;
  network?: string;
  className?: string;
}

export const NetworkIndicator: React.FC<NetworkIndicatorProps> = ({
  isConnected,
  network = 'testnet',
  className,
}) => {
  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg',
      isConnected 
        ? 'bg-primary-500/20 border border-primary-500/30' 
        : 'bg-accent-500/20 border border-accent-500/30',
      className
    )}>
      {isConnected ? (
        <Wifi className="h-4 w-4 text-primary-400" />
      ) : (
        <WifiOff className="h-4 w-4 text-accent-400" />
      )}
      <span className={cn(
        'text-sm font-medium',
        isConnected ? 'text-primary-400' : 'text-accent-400'
      )}>
        {isConnected ? network : 'Déconnecté'}
      </span>
    </div>
  );
};