import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, DollarSign, Clock, TrendingUp, AlertTriangle, Shield } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, CardContent, BeninPatternBackground } from '@hedera-africa/ui';
import Header from '../components/Layout/Header';
import VerificationBadge from '../components/VerificationBadge';
import { useParcels } from '../hooks/useParcels';
import { useP2PLoans, CreateLoanRequest } from '../hooks/useLoans';
import { Parcel } from '../types';
import { formatCurrency, formatArea } from '../utils/formatters';

const loanRequestSchema = z.object({
  parcelId: z.string().min(1, 'Please select a parcel'),
  principalUsd: z.number().min(1000, 'Minimum loan amount is $1,000').max(100000, 'Maximum loan amount is $100,000'),
  interestRate: z.number().min(5, 'Minimum interest rate is 5%').max(50, 'Maximum interest rate is 50%'),
  duration: z.number().min(1, 'Minimum duration is 1 month').max(60, 'Maximum duration is 60 months'),
  collateralRatio: z.number().min(0.3, 'Minimum LTV is 30%').max(0.8, 'Maximum LTV is 80%'),
  description: z.string().min(10, 'Please provide loan description'),
  autoLiquidation: z.boolean(),
  gracePeriod: z.number().min(0).max(30),
  penaltyRate: z.number().min(0).max(20),
  earlyRepaymentAllowed: z.boolean(),
  partialRepaymentAllowed: z.boolean(),
});

type LoanRequestForm = z.infer<typeof loanRequestSchema>;

const CreateLoanPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedParcelId = searchParams.get('parcelId');
  
  const [eligibleParcels, setEligibleParcels] = useState<Parcel[]>([]);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [loading, setLoading] = useState(false);

  const { fetchMyParcels } = useParcels();
  const { createLoan } = useP2PLoans();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoanRequestForm>({
    resolver: zodResolver(loanRequestSchema),
    defaultValues: {
      principalUsd: 10000,
      interestRate: 12,
      duration: 12,
      collateralRatio: 0.6,
      autoLiquidation: true,
      gracePeriod: 7,
      penaltyRate: 5,
      earlyRepaymentAllowed: true,
      partialRepaymentAllowed: false,
    },
  });

  const watchedValues = watch();

  useEffect(() => {
    loadEligibleParcels();
  }, []);

  const loadEligibleParcels = async () => {
    try {
      const parcels = await fetchMyParcels();
      // Only parcels that are tokenized and not already used as collateral
      const eligible = parcels.filter(p => 
        p.htsTokenId && 
        (p.status === 'LISTED' || p.status === 'MINTED')
      );
      setEligibleParcels(eligible);

      // Auto-select parcel if preselected
      if (preselectedParcelId) {
        const preselected = eligible.find(p => p.id === preselectedParcelId);
        if (preselected) {
          handleParcelSelect(preselected);
        }
      }
    } catch (error) {
      console.error('Failed to load parcels:', error);
    }
  };

  const handleParcelSelect = (parcel: Parcel) => {
    setSelectedParcel(parcel);
    setValue('parcelId', parcel.id);
    
    // Auto-suggest loan amount based on parcel value
    if (parcel.priceUsd) {
      const suggestedAmount = Math.round(parcel.priceUsd * watchedValues.collateralRatio);
      setValue('principalUsd', Math.min(suggestedAmount, 100000));
    }
  };

  const onSubmit = async (data: LoanRequestForm) => {
    setLoading(true);
    try {
      const loanRequest: CreateLoanRequest = {
        parcelId: data.parcelId,
        principalUsd: data.principalUsd,
        interestRate: data.interestRate,
        duration: data.duration,
        collateralRatio: data.collateralRatio,
        terms: {
          description: data.description,
          autoLiquidation: data.autoLiquidation,
          gracePeriod: data.gracePeriod,
          penaltyRate: data.penaltyRate,
          earlyRepaymentAllowed: data.earlyRepaymentAllowed,
          partialRepaymentAllowed: data.partialRepaymentAllowed,
        },
      };

      const result = await createLoan(loanRequest);
      if (result) {
        navigate('/p2p-loans');
      }
    } catch (error) {
      console.error('Failed to create loan request:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyPayment = () => {
    const principal = watchedValues.principalUsd || 0;
    const rate = (watchedValues.interestRate || 0) / 100 / 12;
    const months = watchedValues.duration || 1;
    
    if (rate === 0) return principal / months;
    
    return (principal * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);
  };

  const monthlyPayment = calculateMonthlyPayment();
  const totalRepayment = monthlyPayment * (watchedValues.duration || 1);
  const totalInterest = totalRepayment - (watchedValues.principalUsd || 0);

  return (
    <div className="min-h-screen bg-dark-950 relative">
      <BeninPatternBackground className="fixed inset-0" />
      <Header />
      
      <div className="relative pt-8 pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Link
              to="/p2p-loans"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-primary-400 transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to P2P Loans
            </Link>
            
            <h1 className="font-heading text-3xl font-bold text-white mb-2">
              Create Loan Request
            </h1>
            <p className="text-gray-400">
              Use your tokenized land as collateral to request a P2P loan
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Form */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Collateral Selection */}
                    <div>
                      <h3 className="font-heading text-lg font-semibold text-white mb-4">
                        Select Collateral
                      </h3>
                      
                      {eligibleParcels.length === 0 ? (
                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                          <p className="text-yellow-400 font-medium mb-2">No Eligible Parcels</p>
                          <p className="text-gray-400 text-sm">
                            You need tokenized land parcels to use as collateral.
                          </p>
                          <Link to="/mint" className="inline-block mt-2">
                            <Button size="sm">Tokenize Land</Button>
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {eligibleParcels.map((parcel) => (
                            <div
                              key={parcel.id}
                              onClick={() => handleParcelSelect(parcel)}
                              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                                selectedParcel?.id === parcel.id
                                  ? 'bg-primary-500/20 border-primary-500/50'
                                  : 'bg-dark-700/30 border-dark-600/30 hover:border-primary-500/30'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium text-white">{parcel.title}</h4>
                                  <p className="text-gray-400 text-sm">
                                    {formatArea(parcel.areaM2)} • {parcel.priceUsd ? formatCurrency(parcel.priceUsd) : 'No price set'}
                                  </p>
                                </div>
                                <VerificationBadge type={parcel.verificationType} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {errors.parcelId && (
                        <p className="text-red-400 text-sm mt-1">{errors.parcelId.message}</p>
                      )}
                    </div>

                    {/* Loan Details */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Loan Amount (USD)
                        </label>
                        <input
                          {...register('principalUsd', { valueAsNumber: true })}
                          type="number"
                          min="1000"
                          max="100000"
                          step="100"
                          className="w-full px-4 py-3 bg-dark-700/30 rounded-xl text-white border border-dark-600/30 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        {errors.principalUsd && (
                          <p className="text-red-400 text-sm mt-1">{errors.principalUsd.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Interest Rate (% APR)
                        </label>
                        <input
                          {...register('interestRate', { valueAsNumber: true })}
                          type="number"
                          min="5"
                          max="50"
                          step="0.5"
                          className="w-full px-4 py-3 bg-dark-700/30 rounded-xl text-white border border-dark-600/30 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        {errors.interestRate && (
                          <p className="text-red-400 text-sm mt-1">{errors.interestRate.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Duration (months)
                        </label>
                        <input
                          {...register('duration', { valueAsNumber: true })}
                          type="number"
                          min="1"
                          max="60"
                          className="w-full px-4 py-3 bg-dark-700/30 rounded-xl text-white border border-dark-600/30 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        {errors.duration && (
                          <p className="text-red-400 text-sm mt-1">{errors.duration.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          LTV Ratio
                        </label>
                        <input
                          {...register('collateralRatio', { valueAsNumber: true })}
                          type="number"
                          min="0.3"
                          max="0.8"
                          step="0.05"
                          className="w-full px-4 py-3 bg-dark-700/30 rounded-xl text-white border border-dark-600/30 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        {errors.collateralRatio && (
                          <p className="text-red-400 text-sm mt-1">{errors.collateralRatio.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Loan Terms */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Loan Description & Terms
                      </label>
                      <textarea
                        {...register('description')}
                        rows={4}
                        placeholder="Describe your loan requirements, repayment preferences, and any special conditions..."
                        className="w-full px-4 py-3 bg-dark-700/30 rounded-xl text-white placeholder-gray-400 border border-dark-600/30 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                      />
                      {errors.description && (
                        <p className="text-red-400 text-sm mt-1">{errors.description.message}</p>
                      )}
                    </div>

                    {/* Advanced Terms */}
                    <div>
                      <h3 className="font-heading text-lg font-semibold text-white mb-4">
                        Loan Conditions
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Grace Period (days)
                          </label>
                          <input
                            {...register('gracePeriod', { valueAsNumber: true })}
                            type="number"
                            min="0"
                            max="30"
                            className="w-full px-4 py-3 bg-dark-700/30 rounded-xl text-white border border-dark-600/30 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Penalty Rate (%)
                          </label>
                          <input
                            {...register('penaltyRate', { valueAsNumber: true })}
                            type="number"
                            min="0"
                            max="20"
                            step="0.5"
                            className="w-full px-4 py-3 bg-dark-700/30 rounded-xl text-white border border-dark-600/30 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-3 mt-4">
                        <label className="flex items-center gap-3">
                          <input
                            {...register('autoLiquidation')}
                            type="checkbox"
                            className="w-4 h-4 text-primary-500 bg-dark-700/30 border-dark-600/30 rounded focus:ring-primary-500"
                          />
                          <span className="text-gray-300">Enable automatic liquidation on default</span>
                        </label>

                        <label className="flex items-center gap-3">
                          <input
                            {...register('earlyRepaymentAllowed')}
                            type="checkbox"
                            className="w-4 h-4 text-primary-500 bg-dark-700/30 border-dark-600/30 rounded focus:ring-primary-500"
                          />
                          <span className="text-gray-300">Allow early repayment without penalty</span>
                        </label>

                        <label className="flex items-center gap-3">
                          <input
                            {...register('partialRepaymentAllowed')}
                            type="checkbox"
                            className="w-4 h-4 text-primary-500 bg-dark-700/30 border-dark-600/30 rounded focus:ring-primary-500"
                          />
                          <span className="text-gray-300">Allow partial repayments</span>
                        </label>
                      </div>
                    </div>

                    {/* Submit */}
                    <Button
                      type="submit"
                      className="w-full neon-glow-hover"
                      isLoading={isSubmitting || loading}
                      disabled={!selectedParcel}
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Create Loan Request
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            {/* Loan Summary */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >
              {/* Calculations */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-heading text-lg font-semibold text-white mb-4">
                    Loan Summary
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Loan Amount:</span>
                      <span className="text-white font-semibold">
                        {formatCurrency(watchedValues.principalUsd || 0)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-400">Monthly Payment:</span>
                      <span className="text-white font-semibold">
                        {formatCurrency(monthlyPayment)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Interest:</span>
                      <span className="text-secondary-400 font-semibold">
                        {formatCurrency(totalInterest)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between pt-2 border-t border-dark-600/30">
                      <span className="text-gray-400">Total Repayment:</span>
                      <span className="text-white font-bold text-lg">
                        {formatCurrency(totalRepayment)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Risk Warning */}
              {selectedParcel?.verificationType === 'UNVERIFIED' && (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5" />
                      <div>
                        <h4 className="text-yellow-400 font-medium mb-2">Unverified Collateral</h4>
                        <p className="text-gray-300 text-sm">
                          Your collateral is not officially verified. This may result in:
                        </p>
                        <ul className="text-gray-400 text-sm mt-2 space-y-1">
                          <li>• Higher interest rates from lenders</li>
                          <li>• Longer time to find funding</li>
                          <li>• Additional due diligence requirements</li>
                          <li>• Lenders may request physical land inspection</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* How it Works */}
              <Card>
                <CardContent className="p-6">
                  <h4 className="font-medium text-white mb-3">How P2P Lending Works</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-primary-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-primary-400 text-xs font-bold">1</span>
                      </div>
                      <p className="text-gray-300">Your NFT is locked as collateral in escrow</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-primary-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-primary-400 text-xs font-bold">2</span>
                      </div>
                      <p className="text-gray-300">Lenders review your request and contact you directly</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-primary-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-primary-400 text-xs font-bold">3</span>
                      </div>
                      <p className="text-gray-300">Once funded, you receive the loan amount</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-primary-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-primary-400 text-xs font-bold">4</span>
                      </div>
                      <p className="text-gray-300">Repay on time to reclaim your NFT, or it transfers to lender</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Verification Benefits */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Shield className="h-5 w-5 text-blue-400" />
                    <h4 className="font-medium text-white">Verification Benefits</h4>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-gray-300">Verified NFTs get better interest rates</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-gray-300">Faster funding from institutional lenders</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                      <span className="text-gray-300">Unverified NFTs rely on community reputation</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                      <span className="text-gray-300">Direct negotiation with individual lenders</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateLoanPage;