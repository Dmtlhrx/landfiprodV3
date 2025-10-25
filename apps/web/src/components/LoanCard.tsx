import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, TrendingUp, Calendar, AlertTriangle, ChevronDown, ChevronUp, MapPin, User, Clock, Wrench, X } from 'lucide-react';
import { Card, CardContent, Badge, Button } from '@hedera-africa/ui';
import { Loan } from '@hedera-africa/ui';
import { formatCurrency, formatPercentage, formatDate } from '@/utils/formatters';

interface LoanCardProps {
  loan: Loan;
  onRepay?: (loanId: string) => void;
  index?: number;
}

const LoanCard: React.FC<LoanCardProps> = ({ loan, onRepay, index = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDevModal, setShowDevModal] = useState(false);
  const isActive = loan.status === 'ACTIVE';
  const isPending = loan.status === 'PENDING';
  const isOverdue = false; // TODO: Calculate based on payment schedule
  
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="h-full"
      >
        <Card className="overflow-hidden h-full flex flex-col">
          <CardContent className="flex-1 flex flex-col">
            {/* Header Section - Always Visible */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0 pr-3">
                <h3 className="font-heading text-base sm:text-lg font-semibold text-white line-clamp-2">
                  {loan.parcel.title}
                </h3>
              </div>
              <Badge 
                variant={
                  loan.status === 'ACTIVE' ? 'success' :
                  loan.status === 'PENDING' ? 'warning' :
                  loan.status === 'REPAID' ? 'success' : 'error'
                }
                className="shrink-0"
              >
                {loan.status}
              </Badge>
            </div>
            
            {/* Main Info Grid - Always Visible */}
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4 mb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-gray-400">
                  <DollarSign className="h-4 w-4 shrink-0" />
                  <span className="text-xs sm:text-sm">Principal</span>
                </div>
                <p className="text-white font-semibold text-sm sm:text-base">
                  {formatCurrency(loan.principalUsd)}
                </p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-gray-400">
                  <TrendingUp className="h-4 w-4 shrink-0" />
                  <span className="text-xs sm:text-sm">LTV</span>
                </div>
                <p className="text-primary-400 font-semibold text-sm sm:text-base">
                  {formatPercentage(loan.ltvBps)}
                </p>
              </div>
            </div>
            
            {/* Overdue Alert - Always Visible if Present */}
            {isOverdue && (
              <div className="flex items-center gap-2 p-2 sm:p-3 bg-accent-500/10 border border-accent-500/30 rounded-lg mb-4">
                <AlertTriangle className="h-4 w-4 text-accent-400 shrink-0" />
                <span className="text-accent-400 text-xs sm:text-sm font-medium">
                  Payment overdue
                </span>
              </div>
            )}
            
            {/* Expandable Content */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4 mb-4 pt-2 border-t border-gray-700/50">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-gray-400">
                        <TrendingUp className="h-4 w-4 shrink-0" />
                        <span className="text-xs sm:text-sm">APR</span>
                      </div>
                      <p className="text-secondary-400 font-semibold text-sm sm:text-base">
                        {formatPercentage(loan.rateAprBps)}
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Calendar className="h-4 w-4 shrink-0" />
                        <span className="text-xs sm:text-sm">Created</span>
                      </div>
                      <p className="text-white font-semibold text-xs sm:text-sm">
                        {formatDate(loan.createdAt)}
                      </p>
                    </div>
                    
                    {/* Additional Details */}
                    {loan.parcel.location && (
                      <div className="space-y-1 xs:col-span-2">
                        <div className="flex items-center gap-2 text-gray-400">
                          <MapPin className="h-4 w-4 shrink-0" />
                          <span className="text-xs sm:text-sm">Location</span>
                        </div>
                        <p className="text-white text-xs sm:text-sm line-clamp-1">
                          {loan.parcel.location}
                        </p>
                      </div>
                    )}
                    
                    {loan.parcel.area && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-gray-400">
                          <span className="text-xs sm:text-sm">Area</span>
                        </div>
                        <p className="text-white font-semibold text-xs sm:text-sm">
                          {loan.parcel.area} m²
                        </p>
                      </div>
                    )}
                    
                    {loan.remainingBalance && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-gray-400">
                          <Clock className="h-4 w-4 shrink-0" />
                          <span className="text-xs sm:text-sm">Remaining</span>
                        </div>
                        <p className="text-accent-400 font-semibold text-xs sm:text-sm">
                          {formatCurrency(loan.remainingBalance)}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Actions Section - Always at Bottom */}
            <div className="mt-auto">
              {/* Expand Button */}
              <Button 
                variant="ghost" 
                size="sm"
                className="w-full mb-3 flex items-center justify-center gap-2 text-gray-400 hover:text-white transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                <span className="text-xs sm:text-sm">
                  {isExpanded ? 'Show less' : 'Show more'}
                </span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
              
              {/* Action Buttons */}
              <div className="flex flex-col xs:flex-row gap-2">
                {/* Fund Button - Show for PENDING loans */}
                {isPending && (
                  <Button 
                    variant="primary" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setShowDevModal(true)}
                  >
                    <span className="text-xs sm:text-sm">Fund Loan</span>
                  </Button>
                )}
                
                {/* Repay Button - Show for ACTIVE loans */}
                {isActive && onRepay && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => onRepay(loan.id)}
                  >
                    <span className="text-xs sm:text-sm">Repay</span>
                  </Button>
                )}
                
                {/* Details Button */}
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="xs:w-auto"
                >
                  <span className="text-xs sm:text-sm">Details</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Development Modal - Intégré directement */}
      {showDevModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowDevModal(false)}
          />
          
          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-w-md w-full mx-auto"
          >
            {/* Close Button */}
            <button
              onClick={() => setShowDevModal(false)}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            
            {/* Modal Body */}
            <div className="p-6 text-center">
              <div className="mx-auto w-16 h-16 bg-primary-500/20 rounded-full flex items-center justify-center mb-4">
                <Wrench className="h-8 w-8 text-primary-400" />
              </div>
              
              <h3 className="text-lg font-semibold text-white mb-2">
                Coming Soon!
              </h3>
              
              <p className="text-gray-400 mb-6 leading-relaxed">
                The loan funding feature is currently under development. We're working hard to bring you this functionality soon.
              </p>
              
              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse"></div>
                  <span>Smart contract integration</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse delay-100"></div>
                  <span>Security audits</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse delay-200"></div>
                  <span>User interface testing</span>
                </div>
              </div>
              
              <Button 
                onClick={() => setShowDevModal(false)}
                className="w-full"
              >
                Got it
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
};

export default LoanCard;