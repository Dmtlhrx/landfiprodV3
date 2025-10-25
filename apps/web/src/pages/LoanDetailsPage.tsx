import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  DollarSign, 
  Clock, 
  User, 
  MapPin,
  Send,
  MessageCircle,
  Shield,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  CreditCard,
  Mail,
  Star,
  TrendingUp
} from 'lucide-react';
import { Button, Card, CardContent, Badge, BeninPatternBackground } from '@hedera-africa/ui';
import Header from '@/components/Layout/Header';
import VerificationBadge from '@/components/VerificationBadge';
import ReputationScore from '@/components/ReputationScore';
import { useP2PLoans, P2PLoan } from '@/hooks/useLoans';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, formatDate, formatDateTime } from '@/utils/formatters';

const LoanDetailsPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loan, setLoan] = useState<P2PLoan | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  
  const { user, wallet } = useAuthStore();
  const { 
    getLoanDetails, 
    fundLoan, 
    repayLoan, 
    liquidateLoan,
    calculateLoanMetrics,
    getRiskLevel 
  } = useP2PLoans();

  useEffect(() => {
    const loadLoan = async () => {
      if (!id) return;
      
      try {
        const loanData = await getLoanDetails(id);
        setLoan(loanData);
      } catch (error) {
        console.error('Failed to load loan:', error);
        setLoan(null);
      } finally {
        setLoading(false);
      }
    };

    loadLoan();
  }, [id, getLoanDetails]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 relative">
        <BeninPatternBackground className="fixed inset-0" />
        <Header />
        <div className="relative pt-8 pb-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse space-y-6">
              <div className="h-6 bg-dark-700/30 rounded w-1/4" />
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="h-64 bg-dark-700/30 rounded-xl" />
                  <div className="h-96 bg-dark-700/30 rounded-xl" />
                </div>
                <div className="space-y-6">
                  <div className="h-48 bg-dark-700/30 rounded-xl" />
                  <div className="h-32 bg-dark-700/30 rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="min-h-screen bg-dark-950 relative">
        <BeninPatternBackground className="fixed inset-0" />
        <Header />
        <div className="relative pt-8 pb-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Loan not found</h1>
            <Link to="/p2p-loans">
              <Button>Back to P2P Loans</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isBorrower = user?.id === loan.borrowerId;
  const isLender = user?.id === loan.lenderId;
  const canFund = user && loan.status === 'OPEN' && user.id !== loan.borrowerId && !loan.lenderId;
  const canRepay = isBorrower && loan.status === 'ACTIVE';
  const canLiquidate = isLender && loan.status === 'ACTIVE';

  const metrics = calculateLoanMetrics(loan);
  const riskLevel = getRiskLevel(loan);

  const handleFund = async () => {
    setActionLoading(true);
    try {
      const success = await fundLoan(loan.id);
      if (success) {
        // Refresh loan data
        const updatedLoan = await getLoanDetails(loan.id);
        if (updatedLoan) setLoan(updatedLoan);
      }
    } catch (error) {
      console.error('Failed to fund loan:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRepay = async () => {
    setActionLoading(true);
    try {
      const success = await repayLoan(loan.id);
      if (success) {
        // Refresh loan data
        const updatedLoan = await getLoanDetails(loan.id);
        if (updatedLoan) setLoan(updatedLoan);
      }
    } catch (error) {
      console.error('Failed to repay loan:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLiquidate = async () => {
    setActionLoading(true);
    try {
      const success = await liquidateLoan(loan.id);
      if (success) {
        // Refresh loan data
        const updatedLoan = await getLoanDetails(loan.id);
        if (updatedLoan) setLoan(updatedLoan);
      }
    } catch (error) {
      console.error('Failed to liquidate loan:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'text-green-400 bg-green-400/10 border-green-400/30';
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      case 'HIGH': return 'text-red-400 bg-red-400/10 border-red-400/30';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'warning';
      case 'ACTIVE': return 'success';
      case 'REPAID': return 'success';
      case 'LIQUIDATED': return 'error';
      case 'DEFAULTED': return 'error';
      default: return 'default';
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 relative">
      <BeninPatternBackground className="fixed inset-0" />
      <Header />
      
      <div className="relative pt-8 pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Navigation */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6"
          >
            <Link
              to="/p2p-loans"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-primary-400 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to P2P Loans
            </Link>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Loan Header */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardContent>
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h1 className="font-heading text-2xl font-bold text-white mb-2">
                          {loan.parcel.title}
                        </h1>
                        <p className="text-gray-400">
                          Loan Request #{loan.id.slice(-8)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={getStatusColor(loan.status) as any}>
                          {loan.status}
                        </Badge>
                        <div className={`px-3 py-1 rounded-lg border text-sm font-medium ${getRiskColor(riskLevel)}`}>
                          {riskLevel} RISK
                        </div>
                      </div>
                    </div>

                    {/* Loan Details Grid */}
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <DollarSign className="h-5 w-5 text-primary-400" />
                          <div>
                            <p className="text-gray-400 text-sm">Principal Amount</p>
                            <p className="text-white font-bold text-xl">
                              {formatCurrency(loan.principalUsd)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Clock className="h-5 w-5 text-secondary-400" />
                          <div>
                            <p className="text-gray-400 text-sm">Duration</p>
                            <p className="text-white font-semibold">
                              {loan.duration} months
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <TrendingUp className="h-5 w-5 text-accent-400" />
                          <div>
                            <p className="text-gray-400 text-sm">Interest Rate</p>
                            <p className="text-white font-semibold">
                              {(loan.interestRate * 100).toFixed(1)}% APR
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Shield className="h-5 w-5 text-blue-400" />
                          <div>
                            <p className="text-gray-400 text-sm">LTV Ratio</p>
                            <p className="text-white font-semibold">
                              {(loan.collateralRatio * 100).toFixed(0)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Loan Terms */}
                    <div className="p-4 bg-dark-700/30 rounded-lg mb-6">
                      <h3 className="font-medium text-white mb-2">Loan Terms</h3>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {loan.terms.description}
                      </p>
                      <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Auto Liquidation:</span>
                          <span className="text-white">{loan.terms.autoLiquidation ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Grace Period:</span>
                          <span className="text-white">{loan.terms.gracePeriod} days</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Early Repayment:</span>
                          <span className="text-white">{loan.terms.earlyRepaymentAllowed ? 'Allowed' : 'Not Allowed'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Penalty Rate:</span>
                          <span className="text-white">{loan.terms.penaltyRate}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Loan Calculations */}
                    <div className="p-4 bg-primary-500/10 border border-primary-500/30 rounded-lg mb-6">
                      <h3 className="font-medium text-white mb-3">Repayment Details</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Monthly Payment:</span>
                          <span className="text-white font-semibold">{formatCurrency(metrics.monthlyPayment)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total Repayment:</span>
                          <span className="text-white font-semibold">{formatCurrency(metrics.totalRepayment)}</span>
                        </div>
                        {loan.dueDate && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Due Date:</span>
                              <span className="text-white">{formatDate(loan.dueDate)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Days Remaining:</span>
                              <span className={`font-semibold ${metrics.isOverdue ? 'text-red-400' : metrics.isNearDue ? 'text-yellow-400' : 'text-white'}`}>
                                {metrics.daysRemaining} days
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      {canFund && (
                        <Button 
                          onClick={handleFund}
                          isLoading={actionLoading}
                          className="flex-1 neon-glow-hover"
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          Fund This Loan
                        </Button>
                      )}

                      {canRepay && (
                        <Button 
                          onClick={handleRepay}
                          isLoading={actionLoading}
                          className="flex-1"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Repay Loan
                        </Button>
                      )}

                      {canLiquidate && metrics.isOverdue && (
                        <Button 
                          onClick={handleLiquidate}
                          isLoading={actionLoading}
                          variant="outline"
                          className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                        >
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Claim Collateral
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Communication Panel */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card>
                  <CardContent>
                    <div className="flex items-center gap-3 mb-6">
                      <MessageCircle className="h-5 w-5 text-primary-400" />
                      <h3 className="font-heading text-xl font-semibold text-white">
                        Direct Communication
                      </h3>
                    </div>

                    {/* Contact Information */}
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      <div className="p-4 bg-dark-700/30 rounded-lg">
                        <h4 className="font-medium text-white mb-3">Borrower Contact</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-white">{loan.borrower.displayName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <a 
                              href={`mailto:${loan.borrower.email}`}
                              className="text-primary-400 hover:text-primary-300 transition-colors"
                            >
                              {loan.borrower.email}
                            </a>
                          </div>
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-gray-400" />
                            <span className="text-white font-mono text-sm">
                              {loan.borrower.walletHedera?.slice(0, 8)}...{loan.borrower.walletHedera?.slice(-6)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {loan.lender && (
                        <div className="p-4 bg-dark-700/30 rounded-lg">
                          <h4 className="font-medium text-white mb-3">Lender Contact</h4>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <span className="text-white">{loan.lender.displayName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-gray-400" />
                              <a 
                                href={`mailto:${loan.lender.email}`}
                                className="text-primary-400 hover:text-primary-300 transition-colors"
                              >
                                {loan.lender.email}
                              </a>
                            </div>
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-gray-400" />
                              <span className="text-white font-mono text-sm">
                                {loan.lender.walletHedera?.slice(0, 8)}...{loan.lender.walletHedera?.slice(-6)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Basic Messaging */}
                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <MessageCircle className="h-4 w-4 text-blue-400" />
                        <span className="text-blue-400 font-medium">Communication Guidelines</span>
                      </div>
                      <div className="text-gray-300 text-sm space-y-2">
                        <p>• Use email for direct communication and negotiation</p>
                        <p>• Verify identity through Hedera wallet addresses</p>
                        <p>• Consider physical land inspection for unverified properties</p>
                        <p>• All loan terms are enforced automatically via smart contracts</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Borrower Info */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card>
                  <CardContent>
                    <h3 className="font-medium text-white mb-4">Borrower Profile</h3>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{loan.borrower.displayName}</p>
                        <p className="text-gray-400 text-sm">{loan.borrower.email}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-400" />
                        <span className="text-white font-semibold">{loan.borrower.reputationScore}</span>
                        <span className="text-gray-400 text-sm">reputation</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-400">Completed:</span>
                          <span className="text-green-400 font-semibold ml-2">{loan.borrower.completedLoans}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Defaults:</span>
                          <span className="text-red-400 font-semibold ml-2">{loan.borrower.defaultedLoans}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Verified Txns:</span>
                          <span className="text-blue-400 font-semibold ml-2">{loan.borrower.verifiedTransactions}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Endorsements:</span>
                          <span className="text-purple-400 font-semibold ml-2">{loan.borrower.communityEndorsements}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-dark-600/30">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Risk Level:</span>
                        <Badge variant={loan.borrower.riskLevel === 'LOW' ? 'success' : loan.borrower.riskLevel === 'MEDIUM' ? 'warning' : 'error'}>
                          {loan.borrower.riskLevel}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Lender Info */}
              {loan.lender && (
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card>
                    <CardContent>
                      <h3 className="font-medium text-white mb-4">Lender Profile</h3>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-secondary-500 to-accent-500 rounded-full flex items-center justify-center">
                          <User className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{loan.lender.displayName}</p>
                          <p className="text-gray-400 text-sm">{loan.lender.email}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-yellow-400" />
                          <span className="text-white font-semibold">{loan.lender.reputationScore}</span>
                          <span className="text-gray-400 text-sm">reputation</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-400">Completed:</span>
                            <span className="text-green-400 font-semibold ml-2">{loan.lender.completedLoans}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Defaults:</span>
                            <span className="text-red-400 font-semibold ml-2">{loan.lender.defaultedLoans}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-dark-600/30">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Risk Level:</span>
                          <Badge variant={loan.lender.riskLevel === 'LOW' ? 'success' : loan.lender.riskLevel === 'MEDIUM' ? 'warning' : 'error'}>
                            {loan.lender.riskLevel}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Collateral Info */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card>
                  <CardContent>
                    <h3 className="font-medium text-white mb-4">Collateral Details</h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <VerificationBadge 
                          type={loan.parcel.verificationType}
                          details={loan.parcel.verificationDetails}
                        />
                      </div>

                      <div className="flex justify-between">
                        <span className="text-gray-400">Area:</span>
                        <span className="text-white font-semibold">
                          {loan.parcel.areaM2.toLocaleString()} m²
                        </span>
                      </div>

                      {loan.parcel.priceUsd && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Estimated Value:</span>
                          <span className="text-white font-semibold">
                            {formatCurrency(loan.parcel.priceUsd)}
                          </span>
                        </div>
                      )}

                      {loan.parcel.htsTokenId && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Token ID:</span>
                          <a
                            href={`https://hashscan.io/testnet/token/${loan.parcel.htsTokenId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-400 hover:text-primary-300 transition-colors font-mono text-xs"
                          >
                            {loan.parcel.htsTokenId}
                            <ExternalLink className="h-3 w-3 inline ml-1" />
                          </a>
                        </div>
                      )}

                      <div className="flex justify-between">
                        <span className="text-gray-400">Location:</span>
                        <span className="text-white font-mono text-xs">
                          {loan.parcel.latitude.toFixed(4)}, {loan.parcel.longitude.toFixed(4)}
                        </span>
                      </div>
                    </div>

                    <Link to={`/parcels/${loan.parcel.id}`} className="block mt-4">
                      <Button variant="outline" size="sm" className="w-full">
                        <MapPin className="h-4 w-4 mr-2" />
                        View Parcel Details
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Transaction History */}
              {loan.activities && loan.activities.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <Card>
                    <CardContent>
                      <h3 className="font-medium text-white mb-4">Transaction History</h3>
                      
                      <div className="space-y-3">
                        {loan.activities.map((activity) => (
                          <div key={activity.id} className="flex items-center justify-between p-3 bg-dark-700/30 rounded-lg">
                            <div>
                              <span className="text-white font-medium">{activity.type.replace('_', ' ')}</span>
                              <p className="text-gray-400 text-sm">{formatDateTime(activity.createdAt)}</p>
                            </div>
                            {activity.ref && (
                              <a
                                href={`https://hashscan.io/testnet/transaction/${activity.ref}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-400 hover:text-primary-300 transition-colors"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoanDetailsPage;