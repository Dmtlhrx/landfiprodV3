import React from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldCheck, AlertTriangle, Users } from 'lucide-react';
import { Badge } from '@hedera-africa/ui';
import { cn } from '@hedera-africa/ui';

interface VerificationBadgeProps {
  type: 'VERIFIED' | 'UNVERIFIED';
  details?: {
    type: 'NOTARY' | 'STATE' | 'COMMUNITY' | 'NONE';
    confidence: number;
    riskAssessment: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  className?: string;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  type,
  details,
  size = 'md',
  showDetails = false,
  className,
}) => {
  const getVerificationConfig = () => {
    if (type === 'VERIFIED') {
      return {
        icon: ShieldCheck,
        label: 'Verified',
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
        borderColor: 'border-green-500/30',
        variant: 'success' as const,
      };
    } else {
      return {
        icon: Shield,
        label: 'Unverified',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20',
        borderColor: 'border-yellow-500/30',
        variant: 'warning' as const,
      };
    }
  };

  const getRiskConfig = (risk: string) => {
    switch (risk) {
      case 'LOW':
        return { color: 'text-green-400', label: 'Low Risk' };
      case 'MEDIUM':
        return { color: 'text-yellow-400', label: 'Medium Risk' };
      case 'HIGH':
        return { color: 'text-red-400', label: 'High Risk' };
      default:
        return { color: 'text-gray-400', label: 'Unknown Risk' };
    }
  };

  const config = getVerificationConfig();
  const Icon = config.icon;

  const sizes = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2',
  };

  if (showDetails && details) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn('space-y-2', className)}
      >
        <div className={cn(
          'flex items-center gap-2 rounded-lg border',
          config.bgColor,
          config.borderColor,
          sizes[size]
        )}>
          <Icon className={cn('h-4 w-4', config.color)} />
          <span className={cn('font-medium', config.color)}>
            {config.label}
          </span>
          {details.type !== 'NONE' && (
            <Badge variant="outline" size="sm">
              {details.type}
            </Badge>
          )}
        </div>

        {details.confidence > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">Confidence:</span>
            <div className="flex-1 bg-dark-700 rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${details.confidence}%` }}
                transition={{ duration: 1, delay: 0.2 }}
                className={cn(
                  'h-full rounded-full',
                  details.confidence >= 80 ? 'bg-green-500' :
                  details.confidence >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                )}
              />
            </div>
            <span className="text-white font-medium">{details.confidence}%</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <AlertTriangle className={cn('h-4 w-4', getRiskConfig(details.riskAssessment).color)} />
          <span className={cn('text-sm font-medium', getRiskConfig(details.riskAssessment).color)}>
            {getRiskConfig(details.riskAssessment).label}
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <Badge variant={config.variant} className={cn('flex items-center gap-1', className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

export default VerificationBadge;