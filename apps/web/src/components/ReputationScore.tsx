import React from 'react';
import { motion } from 'framer-motion';
import { Star, TrendingUp, TrendingDown, Users, CheckCircle } from 'lucide-react';
import { Card, CardContent, Badge } from '@hedera-africa/ui';
import { cn } from '@hedera-africa/ui';

interface ReputationScoreProps {
  score: number;
  totalLoans?: number;
  successfulLoans?: number;
  compact?: boolean;
  className?: string;
}

export const ReputationScore: React.FC<ReputationScoreProps> = ({
  score,
  totalLoans = 0,
  successfulLoans = 0,
  compact = false,
  className,
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getRiskLevel = (score: number) => {
    if (score >= 80) return 'LOW';
    if (score >= 60) return 'MEDIUM';
    return 'HIGH';
  };

  const successRate = totalLoans > 0 
    ? Math.round((successfulLoans / totalLoans) * 100)
    : 0;

  const defaultedLoans = totalLoans - successfulLoans;

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="flex items-center gap-1">
          <Star className={cn('h-4 w-4', getScoreColor(score))} />
          <span className={cn('font-semibold', getScoreColor(score))}>
            {score}
          </span>
        </div>
        <Badge variant={getRiskLevel(score) === 'LOW' ? 'success' : getRiskLevel(score) === 'MEDIUM' ? 'warning' : 'error'}>
          {getRiskLevel(score)} RISK
        </Badge>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-lg font-semibold text-white">
            Reputation Score
          </h3>
          <div className="flex items-center gap-2">
            <Star className={cn('h-5 w-5', getScoreColor(score))} />
            <span className={cn('text-2xl font-bold', getScoreColor(score))}>
              {score}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-sm text-gray-400">Completed</span>
            </div>
            <p className="text-xl font-semibold text-white">{successfulLoans}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-400" />
              <span className="text-sm text-gray-400">Defaults</span>
            </div>
            <p className="text-xl font-semibold text-white">{defaultedLoans}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-gray-400">Success Rate</span>
            </div>
            <p className="text-xl font-semibold text-white">{successRate}%</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-400" />
              <span className="text-sm text-gray-400">Total Loans</span>
            </div>
            <p className="text-xl font-semibold text-white">{totalLoans}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-dark-600/30">
          <span className="text-sm text-gray-400">Risk Level</span>
          <Badge variant={getRiskLevel(score) === 'LOW' ? 'success' : getRiskLevel(score) === 'MEDIUM' ? 'warning' : 'error'}>
            {getRiskLevel(score)} RISK
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReputationScore;