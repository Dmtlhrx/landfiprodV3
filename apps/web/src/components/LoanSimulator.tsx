import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calculator, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react';
import { Card, CardContent, Button } from '@hedera-africa/ui';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { LOAN_CONFIG } from '@/utils/constants';
import { useAuthStore } from '@/store/authStore';


interface LoanSimulatorProps {
  onCreateLoan?: (data: {
    parcelId: string;
    principalUsd: number;
    interestRate: number;
    duration: number; // This will be in DAYS for backend
    ltvRatio: number;
    description?: string;
  }) => void;
  selectedParcelId?: string;
  selectedParcelValue?: number;
  className?: string;
}

const LoanSimulator: React.FC<LoanSimulatorProps> = ({
  onCreateLoan,
  selectedParcelId,
  selectedParcelValue,
  className,
}) => {
  const [loanAmount, setLoanAmount] = useState(10000);
  const [ltv, setLtv] = useState(LOAN_CONFIG.defaultLtv);
  const [durationMonths, setDurationMonths] = useState(12); // Keep in months for UI
  const [interestRate, setInterestRate] = useState(LOAN_CONFIG.baseApr);

  const calculations = useMemo(() => {
    const collateralValue = selectedParcelValue || Math.round(loanAmount / (ltv / 100));
    const maxLoanAmount = Math.round(collateralValue * (ltv / 100));
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = durationMonths;
    const monthlyPayment = Math.round(
      (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
      (Math.pow(1 + monthlyRate, numPayments) - 1)
    );
    const totalRepayment = monthlyPayment * numPayments;
    const totalInterest = totalRepayment - loanAmount;
    const liquidationPrice = Math.round(collateralValue * (LOAN_CONFIG.liquidationThreshold / 100));
    
    return {
      collateralValue,
      maxLoanAmount,
      monthlyPayment,
      totalInterest,
      totalRepayment,
      liquidationPrice,
      isValidLoan: loanAmount <= maxLoanAmount && loanAmount >= LOAN_CONFIG.minLoanAmount,
    };
  }, [loanAmount, ltv, durationMonths, interestRate, selectedParcelValue]);

  const handleCreateLoan = () => {
    console.log('🎯 LoanSimulator handleCreateLoan called');
    console.log('Selected Parcel ID:', selectedParcelId);
    console.log('Current loan amount:', loanAmount);
    console.log('Duration in months:', durationMonths);
    
    if (!onCreateLoan) {
      console.error('❌ onCreateLoan callback not provided');
      return;
    }
    
    if (!selectedParcelId) {
      console.error('❌ No parcel selected');
      return;
    }
    
    if (!calculations.isValidLoan) {
      console.error('❌ Invalid loan configuration');
      return;
    }

    // Convert months to days for backend
    const durationDays = Math.round(durationMonths * 30.44); // Average days per month
    console.log('📅 Converting duration:', durationMonths, 'months →', durationDays, 'days');

    const { wallet } = useAuthStore.getState();
    const borrowerAccountId = wallet.accountId;
    // Prepare loan data
    const loanData = {
      parcelId: selectedParcelId,
      principalUsd: loanAmount,
      interestRate: interestRate,
      duration: durationDays, // en jours
      ltvRatio: ltv,
      borrowerAccountId,
      description: `Prêt simulé - ${formatCurrency(loanAmount)} sur ${durationMonths} mois à ${interestRate}% APR`
    };
    

    console.log('📋 Loan data being sent to parent:', loanData);
    
    // Validate data before sending
  

    if (durationDays < 30 || durationDays > 365) {
      console.error('❌ Duration out of range:', durationDays, 'days');
      return;
    }

    onCreateLoan(loanData);
  };

  // Update loan amount when parcel value changes
  React.useEffect(() => {
    if (selectedParcelValue) {
      const maxLoan = Math.round(selectedParcelValue * (ltv / 100));
      if (loanAmount > maxLoan) {
        const newAmount = Math.min(maxLoan, LOAN_CONFIG.maxLoanAmount);
        console.log('📊 Adjusting loan amount from', loanAmount, 'to', newAmount);
        setLoanAmount(newAmount);
      }
    }
  }, [selectedParcelValue, ltv, loanAmount]);

  return (
    <Card className={className}>
      <CardContent>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-primary-500/20 rounded-lg">
            <Calculator className="h-6 w-6 text-primary-400" />
          </div>
          <h3 className="font-heading text-xl font-semibold text-white">
            Simulateur de Prêt
          </h3>
        </div>

        {!selectedParcelId && (
          <div className="p-4 bg-secondary-500/10 border border-secondary-500/30 rounded-lg mb-6">
            <p className="text-secondary-400 font-medium mb-1">Collatéral requis</p>
            <p className="text-gray-400 text-sm">
              Sélectionnez une parcelle tokenisée pour calculer votre prêt
            </p>
          </div>
        )}

        <div className="space-y-6">
          {/* Loan Amount */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-300">
                Montant du Prêt (USD)
              </label>
              {selectedParcelValue && (
                <span className="text-xs text-gray-400">
                  Max: {formatCurrency(calculations.maxLoanAmount)}
                </span>
              )}
            </div>
            <input
              type="range"
              min={LOAN_CONFIG.minLoanAmount}
              max={selectedParcelValue ? calculations.maxLoanAmount : LOAN_CONFIG.maxLoanAmount}
              step="1000"
              value={loanAmount}
              onChange={(e) => {
                const newAmount = Number(e.target.value);
                console.log('💰 Loan amount changed to:', newAmount);
                setLoanAmount(newAmount);
              }}
              className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-sm text-gray-400 mt-1">
              <span>{formatCurrency(LOAN_CONFIG.minLoanAmount)}</span>
              <span className="text-white font-semibold">
                {formatCurrency(loanAmount)}
              </span>
              <span>{formatCurrency(selectedParcelValue ? calculations.maxLoanAmount : LOAN_CONFIG.maxLoanAmount)}</span>
            </div>
          </div>

          {/* Duration - Keep UI in months, convert to days when sending */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Durée ({durationMonths} mois)
            </label>
            <input
              type="range"
              min="1" // 1 month = ~30 days
              max="12" // 12 months = ~365 days
              step="1"
              value={durationMonths}
              onChange={(e) => {
                const newDuration = Number(e.target.value);
                console.log('📅 Duration changed to:', newDuration, 'months');
                setDurationMonths(newDuration);
              }}
              className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-sm text-gray-400 mt-1">
              <span>1 mois</span>
              <span className="text-white font-semibold">{durationMonths} mois</span>
              <span>12 mois</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              ≈ {Math.round(durationMonths * 30.44)} jours
            </div>
          </div>

          {/* Interest Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Taux d'Intérêt ({interestRate}% APR)
            </label>
            <input
              type="range"
              min="5"
              max="25"
              step="0.5"
              value={interestRate}
              onChange={(e) => setInterestRate(Number(e.target.value))}
              className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-sm text-gray-400 mt-1">
              <span>5%</span>
              <span className="text-white font-semibold">{interestRate}%</span>
              <span>25%</span>
            </div>
          </div>

          {/* LTV Ratio */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Ratio LTV ({ltv}%)
            </label>
            <input
              type="range"
              min={LOAN_CONFIG.minLtv}
              max={LOAN_CONFIG.maxLtv}
              step="5"
              value={ltv}
              onChange={(e) => setLtv(Number(e.target.value))}
              className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-sm text-gray-400 mt-1">
              <span>{LOAN_CONFIG.minLtv}%</span>
              <span className="text-white font-semibold">{ltv}%</span>
              <span>{LOAN_CONFIG.maxLtv}%</span>
            </div>
          </div>

          {/* Calculations Display */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-dark-700/30 rounded-lg p-4 space-y-3"
          >
            <div className="flex justify-between">
              <span className="text-gray-400">Collatéral Requis:</span>
              <span className="text-white font-semibold">
                {formatCurrency(calculations.collateralValue)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-400">Paiement Mensuel:</span>
              <span className="text-white font-semibold">
                {formatCurrency(calculations.monthlyPayment)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-400">Remboursement Total:</span>
              <span className="text-primary-400 font-semibold">
                {formatCurrency(calculations.totalRepayment)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-400">Intérêts Total:</span>
              <span className="text-secondary-400 font-semibold">
                {formatCurrency(calculations.totalInterest)}
              </span>
            </div>
            
            <div className="flex justify-between items-center pt-2 border-t border-dark-600/30">
              <div className="flex items-center gap-2 text-gray-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">Seuil Liquidation:</span>
              </div>
              <span className="text-accent-400 font-semibold">
                {formatCurrency(calculations.liquidationPrice)}
              </span>
            </div>
          </motion.div>

          {/* Validation Messages */}
          {selectedParcelId && !calculations.isValidLoan && (
            <div className="p-4 bg-accent-500/10 border border-accent-500/30 rounded-lg">
              <p className="text-accent-400 font-medium mb-1">Prêt invalide</p>
              <p className="text-gray-400 text-sm">
                {loanAmount > calculations.maxLoanAmount 
                  ? `Le montant maximum pour cette parcelle est ${formatCurrency(calculations.maxLoanAmount)}`
                  : `Le montant minimum est ${formatCurrency(LOAN_CONFIG.minLoanAmount)}`
                }
              </p>
            </div>
          )}

          {/* Action Button */}
          {selectedParcelId && onCreateLoan && (
            <Button 
              className="w-full neon-glow-hover"
              onClick={handleCreateLoan}
              disabled={!calculations.isValidLoan}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Créer ce Prêt
            </Button>
          )}

          {!selectedParcelId && (
            <div className="text-center">
              <p className="text-gray-400 text-sm">
                Sélectionnez une parcelle pour calculer votre prêt
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LoanSimulator;