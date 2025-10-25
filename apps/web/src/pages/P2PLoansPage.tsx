import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  Shield, 
  AlertTriangle, 
  Clock, 
  DollarSign,
  MapPin,
  User,
  Star,
  Filter,
  Search,
  Plus
} from 'lucide-react';
import { Button, Card, Badge, BeninPatternBackground } from '@hedera-africa/ui';
import Header from '@/components/Layout/Header';
import P2PLoanCard from '@/components/P2PLoanCard';
import { useP2PLoans } from '../hooks/useLoans';
import { useAuthStore } from '@/store/authStore';

export const P2PLoansPage: React.FC = () => {
  const { loans, myLoans, loading, fundLoan, repayLoan, liquidateLoan, getRiskLevel } = useP2PLoans();
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRisk, setSelectedRisk] = useState<'ALL' | 'LOW' | 'MEDIUM' | 'HIGH'>('ALL');
  const [selectedVerification, setSelectedVerification] = useState<'ALL' | 'VERIFIED' | 'UNVERIFIED'>('ALL');
  const [activeTab, setActiveTab] = useState<'marketplace' | 'my-loans'>('marketplace');

  const filteredLoans = loans.filter(loan => {
    const matchesSearch = loan.parcel.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         loan.borrower.displayName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRisk = selectedRisk === 'ALL' || getRiskLevel(loan) === selectedRisk;
    
    const matchesVerification = selectedVerification === 'ALL' || 
                               loan.parcel.verificationType === selectedVerification;
    
    return matchesSearch && matchesRisk && matchesVerification;
  });

  const handleFundLoan = async (loanId: string) => {
    await fundLoan(loanId);
  };

  const handleRepayLoan = async (loanId: string) => {
    await repayLoan(loanId);
  };

  const handleLiquidateLoan = async (loanId: string) => {
    await liquidateLoan(loanId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 relative">
        <BeninPatternBackground className="fixed inset-0" />
        <Header />
        <div className="relative pt-8 pb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-dark-700/30 rounded w-1/3"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-96 bg-dark-700/30 rounded-xl"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 relative">
      <BeninPatternBackground className="fixed inset-0" />
      <Header />
      
      <div className="relative pt-8 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  P2P Lending Marketplace
                </h1>
                <p className="text-gray-400 text-lg">
                  Discover lending opportunities backed by tokenized land assets
                </p>
              </div>
              
              <Link to="/p2p-loans/create">
                <Button className="neon-glow-hover">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Loan Request
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <div className="flex bg-dark-700/30 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('marketplace')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'marketplace'
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Marketplace ({filteredLoans.length})
              </button>
              <button
                onClick={() => setActiveTab('my-loans')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'my-loans'
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                My Loans ({myLoans.length})
              </button>
            </div>
          </motion.div>

          {/* Filters - Only show for marketplace */}
          {activeTab === 'marketplace' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <Card>
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          placeholder="Search by parcel or borrower..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-dark-700/30 rounded-xl text-white placeholder-gray-400 border border-dark-600/30 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <select
                        value={selectedRisk}
                        onChange={(e) => setSelectedRisk(e.target.value as any)}
                        className="px-4 py-3 bg-dark-700/30 border border-dark-600/30 rounded-xl text-white focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="ALL">All Risk Levels</option>
                        <option value="LOW">Low Risk</option>
                        <option value="MEDIUM">Medium Risk</option>
                        <option value="HIGH">High Risk</option>
                      </select>

                      <select
                        value={selectedVerification}
                        onChange={(e) => setSelectedVerification(e.target.value as any)}
                        className="px-4 py-3 bg-dark-700/30 border border-dark-600/30 rounded-xl text-white focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="ALL">All Verifications</option>
                        <option value="VERIFIED">Verified Only</option>
                        <option value="UNVERIFIED">Unverified Only</option>
                      </select>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Loans Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {activeTab === 'marketplace' ? (
              filteredLoans.length > 0 ? (
                filteredLoans.map((loan, index) => (
                  <P2PLoanCard
                    key={loan.id}
                    loan={loan}
                    viewType="marketplace"
                    onFund={handleFundLoan}
                    index={index}
                    loading={loading}
                  />
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <TrendingUp className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">
                    No loans available
                  </h3>
                  <p className="text-gray-500">
                    Check back later for new lending opportunities
                  </p>
                </div>
              )
            ) : (
              myLoans.length > 0 ? (
                myLoans.map((loan, index) => (
                  <P2PLoanCard
                    key={loan.id}
                    loan={loan}
                    viewType={user?.id === loan.borrowerId ? 'borrower' : 'lender'}
                    onRepay={handleRepayLoan}
                    onLiquidate={handleLiquidateLoan}
                    index={index}
                    loading={loading}
                  />
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <DollarSign className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">
                    No loans yet
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Create your first loan request or fund existing loans
                  </p>
                  <Link to="/p2p-loans/create">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Loan Request
                    </Button>
                  </Link>
                </div>
              )
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default P2PLoansPage;