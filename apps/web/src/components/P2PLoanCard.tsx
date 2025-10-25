import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  DollarSign,
  MapPin,
  Mail,
  Star,
  Eye,
  MessageCircle,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Calendar,
  Percent,
  Shield,
} from 'lucide-react';
import { Card, CardContent, Badge, Button } from '@hedera-africa/ui';
import { P2PLoan } from '../hooks/useLoans';
import { formatCurrency, formatDate } from '../utils/formatters';

interface P2PLoanCardProps {
  loan: P2PLoan;
  viewType: 'borrower' | 'lender' | 'marketplace';
  onFund?: (loanId: string) => void;
  onRepay?: (loanId: string) => void;
  onLiquidate?: (loanId: string) => void;
  index?: number;
  loading?: boolean;
}

export const P2PLoanCard: React.FC<P2PLoanCardProps> = ({
  loan,
  viewType,
  onFund,
  onRepay,
  onLiquidate,
  index = 0,
  loading = false,
}) => {
  const getStatusConfig = (status: string) => {
    const configs = {
      OPEN: { color: 'text-blue-400', variant: 'warning' as const, label: 'Open' },
      ACTIVE: { color: 'text-emerald-400', variant: 'success' as const, label: 'Active' },
      REPAID: { color: 'text-emerald-400', variant: 'success' as const, label: 'Repaid' },
      LIQUIDATED: { color: 'text-red-400', variant: 'error' as const, label: 'Liquidated' },
      DEFAULTED: { color: 'text-red-400', variant: 'error' as const, label: 'Defaulted' },
    };
    return configs[status] || { color: 'text-slate-400', variant: 'default' as const, label: status };
  };

  const getRiskLevel = (loan: P2PLoan): 'LOW' | 'MEDIUM' | 'HIGH' => {
    const { verificationType, verificationDetails } = loan.parcel;
    const { reputationScore } = loan.borrower;

    if (
      verificationType === 'VERIFIED' &&
      reputationScore >= 80 &&
      verificationDetails &&
      verificationDetails.confidence >= 90
    ) {
      return 'LOW';
    } else if (
      verificationType === 'VERIFIED' ||
      (reputationScore >= 60 && verificationDetails && verificationDetails.confidence >= 70)
    ) {
      return 'MEDIUM';
    } else {
      return 'HIGH';
    }
  };

  const getRiskConfig = (risk: string) => {
    const configs = {
      LOW: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: Shield },
      MEDIUM: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: AlertTriangle },
      HIGH: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: AlertTriangle },
    };
    return configs[risk] || configs.MEDIUM;
  };

  const statusConfig = getStatusConfig(loan.status);
  const riskLevel = getRiskLevel(loan);
  const riskConfig = getRiskConfig(riskLevel);
  const RiskIcon = riskConfig.icon;

  const daysRemaining = loan.dueDate
    ? Math.ceil((new Date(loan.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const monthlyPayment =
    (loan.principalUsd * (1 + (loan.interestRate * loan.duration) / 12)) / loan.duration;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
    >
      <Card hover className="overflow-hidden border border-slate-800 hover:border-slate-700 transition-all duration-300">
        {/* Header Section */}
        <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-6 border-b border-slate-800">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                <Badge variant={riskLevel === 'LOW' ? 'success' : riskLevel === 'MEDIUM' ? 'warning' : 'error'}>
                  <RiskIcon className="w-3 h-3 mr-1" />
                  {riskLevel} Risk
                </Badge>
              </div>
              <h3 className="text-xl font-bold text-white mb-1 tracking-tight">
                {loan.parcel.title}
              </h3>
              <div className="flex items-center gap-4 text-slate-400 text-sm">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  <span>{loan.parcel.areaM2.toLocaleString()} m²</span>
                </div>
                {loan.parcel.verificationType === 'UNVERIFIED' && (
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <Shield className="w-4 h-4" />
                    <span className="font-medium">Unverified</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <div className="flex items-baseline gap-1 mb-1">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <span className="text-3xl font-bold text-white tracking-tight">
                  {formatCurrency(loan.principalUsd).replace('$', '')}
                </span>
              </div>
              <div className="flex items-center gap-1 text-emerald-400">
                <Percent className="w-3.5 h-3.5" />
                <span className="text-sm font-semibold">{(loan.interestRate * 100).toFixed(1)}% APR</span>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-3 gap-px bg-slate-800/50">
          <div className="bg-slate-900 p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-slate-400 text-xs mb-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Duration</span>
            </div>
            <p className="text-white font-bold text-lg">{loan.duration} mo</p>
          </div>
          <div className="bg-slate-900 p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-slate-400 text-xs mb-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>LTV Ratio</span>
            </div>
            <p className="text-white font-bold text-lg">{(loan.collateralRatio * 100).toFixed(0)}%</p>
          </div>
          <div className="bg-slate-900 p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-slate-400 text-xs mb-1">
              <DollarSign className="w-3.5 h-3.5" />
              <span>Monthly</span>
            </div>
            <p className="text-white font-bold text-lg">{formatCurrency(monthlyPayment).replace('$', '').split('.')[0]}</p>
          </div>
        </div>

        {/* Content Section */}
        <CardContent className="p-6 space-y-4">
          {/* Borrower Information */}
          {viewType !== 'borrower' && (
            <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-800/50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-slate-400 text-xs font-medium mb-1.5">Borrower</p>
                  <p className="text-white font-semibold mb-2">{loan.borrower.displayName}</p>
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-slate-400 text-xs">{loan.borrower.email}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-full">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-white text-sm font-bold">{loan.borrower.reputationScore}</span>
                  </div>
                  <Badge
                    variant={
                      loan.borrower.riskLevel === 'LOW'
                        ? 'success'
                        : loan.borrower.riskLevel === 'MEDIUM'
                          ? 'warning'
                          : 'error'
                    }
                    size="sm"
                  >
                    {loan.borrower.riskLevel}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Lender Information */}
          {viewType === 'borrower' && loan.lender && (
            <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-800/50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-slate-400 text-xs font-medium mb-1.5">Lender</p>
                  <p className="text-white font-semibold mb-2">{loan.lender.displayName}</p>
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-slate-400 text-xs">{loan.lender.email}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-full">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-white text-sm font-bold">{loan.lender.reputationScore}</span>
                  </div>
                  <Badge
                    variant={
                      loan.lender.riskLevel === 'LOW'
                        ? 'success'
                        : loan.lender.riskLevel === 'MEDIUM'
                          ? 'warning'
                          : 'error'
                    }
                    size="sm"
                  >
                    {loan.lender.riskLevel}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Days Remaining (Active loans only) */}
          {daysRemaining !== null && loan.status === 'ACTIVE' && (
            <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-800/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs font-medium mb-1">Days Remaining</p>
                  <p className={`text-lg font-bold ${daysRemaining < 30 ? 'text-red-400' : 'text-white'}`}>
                    {daysRemaining} days
                  </p>
                </div>
                {daysRemaining < 30 && (
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                )}
              </div>
            </div>
          )}

          {/* Risk Warning */}
          {loan.parcel.verificationType === 'UNVERIFIED' && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-400 font-semibold text-sm mb-1">Unverified Collateral</p>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    This loan uses unverified land as collateral. Consider physical inspection and borrower reputation before funding.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          {loan.terms.description && (
            <div className="bg-slate-800/20 rounded-lg p-4 border border-slate-800/30">
              <p className="text-slate-300 text-sm leading-relaxed">{loan.terms.description}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            {viewType === 'marketplace' && loan.status === 'OPEN' && onFund && (
              <Button
                className="flex-1"
                onClick={() => onFund(loan.id)}
                isLoading={loading}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Fund Loan
              </Button>
            )}

            {viewType === 'borrower' && loan.status === 'ACTIVE' && onRepay && (
              <Button
                className="flex-1"
                onClick={() => onRepay(loan.id)}
                isLoading={loading}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Repay
              </Button>
            )}

            {viewType === 'lender' &&
              loan.status === 'ACTIVE' &&
              daysRemaining !== null &&
              daysRemaining < 0 &&
              onLiquidate && (
                <Button
                  variant="outline"
                  className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                  onClick={() => onLiquidate(loan.id)}
                  isLoading={loading}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Claim Collateral
                </Button>
              )}
            
            <Link to={`/p2p-loans/${loan.id}`} className="flex-1">
              <Button variant="outline" className="w-full">
                <Eye className="w-4 h-4 mr-2" />
                Details
              </Button>
            </Link>

            <Link to={`/chat/${loan.id}?type=loan`}>
              <Button variant="outline" size="sm" className="px-4">
                <MessageCircle className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default P2PLoanCard;