import React from 'react';
import { Shield, ShieldAlert, ShieldCheck, ShieldX, AlertTriangle, Loader2 } from 'lucide-react';

interface AIVerificationBadgeProps {
  status: 'PENDING' | 'PROCESSING' | 'VERIFIED' | 'FAILED' | 'SUSPICIOUS';
  riskLevel?: 'UNKNOWN' | 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore?: number;
  confidenceScore?: number;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

export const AIVerificationBadge: React.FC<AIVerificationBadgeProps> = ({
  status,
  riskLevel = 'UNKNOWN',
  riskScore,
  confidenceScore,
  size = 'md',
  showDetails = false,
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'PENDING':
        return {
          icon: Shield,
          label: 'Pending',
          color: 'text-gray-400',
          bg: 'bg-gray-500/10',
          border: 'border-gray-500/20',
        };
      case 'PROCESSING':
        return {
          icon: Loader2,
          label: 'AI Analysis...',
          color: 'text-blue-400',
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/20',
          animate: true,
        };
      case 'VERIFIED':
        return {
          icon: ShieldCheck,
          label: 'Verified',
          color: 'text-green-400',
          bg: 'bg-green-500/10',
          border: 'border-green-500/20',
        };
      case 'SUSPICIOUS':
        return {
          icon: ShieldAlert,
          label: 'Suspicious',
          color: 'text-orange-400',
          bg: 'bg-orange-500/10',
          border: 'border-orange-500/20',
        };
      case 'FAILED':
        return {
          icon: ShieldX,
          label: 'Failed',
          color: 'text-red-400',
          bg: 'bg-red-500/10',
          border: 'border-red-500/20',
        };
      default:
        return {
          icon: Shield,
          label: 'Unknown',
          color: 'text-gray-400',
          bg: 'bg-gray-500/10',
          border: 'border-gray-500/20',
        };
    }
  };

  const getRiskConfig = () => {
    switch (riskLevel) {
      case 'VERY_LOW':
        return {
          label: 'Very Low',
          color: 'text-green-400',
          bg: 'bg-green-500/10',
          icon: '🟢',
        };
      case 'LOW':
        return {
          label: 'Low',
          color: 'text-lime-400',
          bg: 'bg-lime-500/10',
          icon: '🟡',
        };
      case 'MEDIUM':
        return {
          label: 'Medium',
          color: 'text-yellow-400',
          bg: 'bg-yellow-500/10',
          icon: '🟠',
        };
      case 'HIGH':
        return {
          label: 'High',
          color: 'text-orange-400',
          bg: 'bg-orange-500/10',
          icon: '🔴',
        };
      case 'CRITICAL':
        return {
          label: 'Critical',
          color: 'text-red-400',
          bg: 'bg-red-500/10',
          icon: '⛔',
        };
      default:
        return {
          label: 'Unknown',
          color: 'text-gray-400',
          bg: 'bg-gray-500/10',
          icon: '⚪',
        };
    }
  };

  const statusConfig = getStatusConfig();
  const riskConfig = getRiskConfig();
  const Icon = statusConfig.icon;

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  if (!showDetails) {
    return (
      <span
        className={`
          inline-flex items-center gap-1.5 font-medium rounded-full
          ${statusConfig.bg} ${statusConfig.color} 
          border ${statusConfig.border}
          ${sizeClasses[size]}
          transition-all duration-200
        `}
      >
        <Icon 
          className={`${iconSizes[size]} ${statusConfig.animate ? 'animate-spin' : ''}`}
        />
        {statusConfig.label}
      </span>
    );
  }

  return (
    <div className="space-y-2">
      {/* Status Badge */}
      <div
        className={`
          inline-flex items-center gap-2 font-medium rounded-lg
          ${statusConfig.bg} ${statusConfig.color} 
          border ${statusConfig.border}
          px-4 py-2
          transition-all duration-200
        `}
      >
        <Icon 
          className={`h-5 w-5 ${statusConfig.animate ? 'animate-spin' : ''}`}
        />
        <div className="flex flex-col">
          <span className="font-semibold">{statusConfig.label}</span>
          {confidenceScore !== undefined && (
            <span className="text-xs opacity-75">
              Confidence: {confidenceScore}%
            </span>
          )}
        </div>
      </div>

      {/* Risk Level Badge */}
      {riskLevel !== 'UNKNOWN' && (
        <div
          className={`
            inline-flex items-center gap-2 font-medium rounded-lg
            ${riskConfig.bg} ${riskConfig.color}
            border border-current/20
            px-4 py-2
            transition-all duration-200
          `}
        >
          <span className="text-lg">{riskConfig.icon}</span>
          <div className="flex flex-col">
            <span className="text-xs opacity-75">Risk Level</span>
            <span className="font-semibold">{riskConfig.label}</span>
            {riskScore !== undefined && (
              <span className="text-xs opacity-75">
                Score: {riskScore}%
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Export default component
export default AIVerificationBadge;