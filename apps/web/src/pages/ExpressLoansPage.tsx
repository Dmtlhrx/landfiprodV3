import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Zap, 
  Shield, 
  Clock, 
  DollarSign, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  FileCheck,
  Plus,
  CreditCard
} from 'lucide-react';
import { Button, Card, CardContent, Badge, BeninPatternBackground } from '@hedera-africa/ui';
import Header from '@/components/Layout/Header';
import { useParcels } from '@/hooks/useParcels';
import { useExpressLoans } from '@/hooks/useExpressLoans';
import { useAuthStore } from '@/store/authStore';
import { Parcel } from '@/types';
import { formatCurrency, formatArea } from '@/utils/formatters';

const ExpressLoansPage: React.FC = () => {
  const [eligibleParcels, setEligibleParcels] = useState<Parcel[]>([]);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [loanAmount, setLoanAmount] = useState(10000);
  
  const { user, wallet } = useAuthStore();
  const { fetchMyParcels } = useParcels();
  const { 
    expressLoans, 
    loading, 
    createExpressLoan, 
    repayExpressLoan,
    calculateExpressLoanTerms 
  } = useExpressLoans();

  useEffect(() => {
    loadEligibleParcels();
  }, []);

  const loadEligibleParcels = async () => {
    try {
      const parcels = await fetchMyParcels();
      // Only verified parcels are eligible for express loans
      const verified = parcels.filter(p => 
        p.htsTokenId && 
        p.verificationType === 'VERIFIED' &&
        (p.status === 'LISTED' || p.status === 'MINTED')
      );
      setEligibleParcels(verified);
    } catch (error) {
      console.error('Failed to load eligible parcels:', error);
    }
  };

  const handleExpressLoan = async () => {
    if (!selectedParcel || !wallet.accountId) {
      toast.error('Please select a parcel and connect your wallet');
      return;
    }

    try {
      await createExpressLoan({
        parcelId: selectedParcel.id,
        principalUsd: loanAmount,
        borrowerAccountId: wallet.accountId,
      });
    } catch (error: any) {
      console.error('Failed to create express loan:', error);
    }
  };

  const handleRepayLoan = async (loanId: string) => {
    try {
      await repayExpressLoan(loanId);
    } catch (error) {
      console.error('Failed to repay express loan:', error);
    }
  };

  const loanTerms = selectedParcel?.priceUsd 
    ? calculateExpressLoanTerms(selectedParcel.priceUsd, loanAmount)
    : null;

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
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-yellow-500/20 rounded-xl">
                <Zap className="h-8 w-8 text-yellow-400" />
              </div>
              <div>
                <h1 className="font-heading text-3xl font-bold text-white">
                  Express Loans
                </h1>
                <p className="text-gray-400">
                  Instant loans for verified land NFTs with automated approval
                </p>
              </div>
            </div>

            {/* Benefits */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <div>
                  <p className="text-green-400 font-medium">Verified NFTs Only</p>
                  <p className="text-gray-400 text-sm">State/notary validated parcels</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <Clock className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="text-blue-400 font-medium">24h Approval</p>
                  <p className="text-gray-400 text-sm">Automated risk assessment</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-400" />
                <div>
                  <p className="text-purple-400 font-medium">6% APR</p>
                  <p className="text-gray-400 text-sm">Fixed rate for verified assets</p>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Parcel Selection */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardContent>
                  <h3 className="font-heading text-xl font-semibold text-white mb-6">
                    Select Verified Collateral
                  </h3>
                  
                  {eligibleParcels.length === 0 ? (
                    <div className="text-center py-8">
                      <Shield className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                      <h4 className="font-medium text-white mb-2">No Verified Parcels</h4>
                      <p className="text-gray-400 text-sm mb-4">
                        You need verified land parcels for express loans
                      </p>
                      <Link to="/verification">
                        <Button>
                          <FileCheck className="h-4 w-4 mr-2" />
                          Verify Your Land
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {eligibleParcels.map((parcel) => (
                        <div
                          key={parcel.id}
                          onClick={() => setSelectedParcel(parcel)}
                          className={`p-4 rounded-lg border cursor-pointer transition-all ${
                            selectedParcel?.id === parcel.id
                              ? 'bg-green-500/20 border-green-500/50'
                              : 'bg-dark-700/30 border-dark-600/30 hover:border-green-500/30'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-white">{parcel.title}</h4>
                              <p className="text-gray-400 text-sm">
                                {formatArea(parcel.areaM2)} • {parcel.priceUsd ? formatCurrency(parcel.priceUsd) : 'No price set'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="success">VERIFIED</Badge>
                              <Badge variant="default">
                                {Math.floor((parcel.priceUsd || 0) * 0.7 / 1000)}K max
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Express Loan Calculator */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardContent>
                  <h3 className="font-heading text-xl font-semibold text-white mb-6">
                    Express Loan Calculator
                  </h3>

                  {selectedParcel && loanTerms ? (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Loan Amount (USD)
                        </label>
                        <input
                          type="range"
                          min="1000"
                          max={loanTerms.maxLoanAmount}
                          step="1000"
                          value={loanAmount}
                          onChange={(e) => setLoanAmount(Number(e.target.value))}
                          className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-sm text-gray-400 mt-1">
                          <span>$1,000</span>
                          <span className="text-white font-semibold">{formatCurrency(loanAmount)}</span>
                          <span>{formatCurrency(loanTerms.maxLoanAmount)}</span>
                        </div>
                      </div>

                      <div className="bg-dark-700/30 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Loan Amount:</span>
                          <span className="text-white font-semibold">{formatCurrency(loanAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">APR Rate:</span>
                          <span className="text-green-400 font-semibold">{loanTerms.aprRate}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Duration:</span>
                          <span className="text-white font-semibold">{loanTerms.duration} months</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">LTV Ratio:</span>
                          <span className="text-blue-400 font-semibold">{loanTerms.ltvRatio}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Monthly Payment:</span>
                          <span className="text-white font-semibold">{formatCurrency(loanTerms.monthlyPayment)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-dark-600/30">
                          <span className="text-gray-400">Total Repayment:</span>
                          <span className="text-white font-bold">{formatCurrency(loanTerms.totalRepayment)}</span>
                        </div>
                      </div>

                      <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="h-4 w-4 text-green-400" />
                          <span className="text-green-400 font-medium">Express Approval</span>
                        </div>
                        <p className="text-gray-300 text-sm">
                          Verified parcels get instant approval with funds disbursed within 24 hours
                        </p>
                      </div>

                      <Button
                        onClick={handleExpressLoan}
                        isLoading={loading}
                        className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                        size="lg"
                        disabled={!wallet.accountId}
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Apply for Express Loan
                      </Button>

                      {!wallet.accountId && (
                        <p className="text-yellow-400 text-sm text-center">
                          Please connect your HashPack wallet to apply
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Shield className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400">
                        Select a verified parcel to calculate your express loan
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* My Express Loans */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8"
          >
            <Card>
              <CardContent>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-heading text-xl font-semibold text-white">
                    My Express Loans ({expressLoans.length})
                  </h3>
                  {eligibleParcels.length > 0 && (
                    <Button size="sm" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Loan
                    </Button>
                  )}
                </div>
                
                {expressLoans.length === 0 ? (
                  <div className="text-center py-8">
                    <Zap className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <h4 className="font-medium text-white mb-2">No Express Loans</h4>
                    <p className="text-gray-400 text-sm">
                      Apply for your first express loan using verified collateral
                    </p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {expressLoans.map((loan, index) => (
                      <motion.div
                        key={loan.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card hover>
                          <CardContent>
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-medium text-white">{loan.parcel.title}</h4>
                              <Badge variant={
                                loan.status === 'ACTIVE' ? 'success' :
                                loan.status === 'REPAID' ? 'success' :
                                loan.status === 'LIQUIDATED' ? 'error' : 'warning'
                              }>
                                {loan.status}
                              </Badge>
                            </div>
                            
                            <div className="space-y-2 mb-4">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Amount:</span>
                                <span className="text-white font-semibold">{formatCurrency(loan.principalUsd)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">APR:</span>
                                <span className="text-green-400 font-semibold">{(loan.rateAprBps / 100)}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">LTV:</span>
                                <span className="text-blue-400 font-semibold">{(loan.ltvBps / 100)}%</span>
                              </div>
                            </div>

                            {loan.status === 'ACTIVE' && (
                              <Button 
                                size="sm" 
                                className="w-full"
                                onClick={() => handleRepayLoan(loan.id)}
                                isLoading={loading}
                              >
                                <DollarSign className="h-4 w-4 mr-2" />
                                Repay Loan
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* How Express Loans Work */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8"
          >
            <Card>
              <CardContent>
                <h3 className="font-heading text-xl font-semibold text-white mb-6">
                  How Express Loans Work
                </h3>
                
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-400 text-sm font-bold">1</span>
                      </div>
                      <div>
                        <h4 className="text-white font-medium">Instant Approval</h4>
                        <p className="text-gray-400 text-sm">Verified NFTs get automatic approval based on state/notary validation</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-400 text-sm font-bold">2</span>
                      </div>
                      <div>
                        <h4 className="text-white font-medium">Collateral Lock</h4>
                        <p className="text-gray-400 text-sm">Your NFT is automatically locked in smart contract escrow</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-400 text-sm font-bold">3</span>
                      </div>
                      <div>
                        <h4 className="text-white font-medium">Fast Disbursement</h4>
                        <p className="text-gray-400 text-sm">Funds transferred to your wallet within 24 hours</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-400 text-sm font-bold">4</span>
                      </div>
                      <div>
                        <h4 className="text-white font-medium">Flexible Repayment</h4>
                        <p className="text-gray-400 text-sm">Repay anytime to unlock your NFT, or auto-liquidation on default</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ExpressLoansPage;