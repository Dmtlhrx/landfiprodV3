import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DollarSign, CreditCard } from 'lucide-react';
import { Button, Card, CardContent, Badge, BeninPatternBackground } from '@hedera-africa/ui';
import Header from '@/components/Layout/Header';
import LoanSimulator from '@/components/LoanSimulator';
import LoanCard from '@/components/LoanCard';
import { useLoans } from '@/hooks/useLoans';
import { useParcels } from '@/hooks/useParcels';
import { Parcel } from '@hedera-africa/ui';

const LoansPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const selectedParcelId = searchParams.get('parcelId');
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [availableParcels, setAvailableParcels] = useState<Parcel[]>([]);
  
  const { loans, loading, createLoan, repayLoan } = useLoans();
  const { fetchMyParcels, getParcelDetails } = useParcels();

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load user's parcels that can be used as collateral
        const myParcels = await fetchMyParcels();
        const eligibleParcels = myParcels.filter(p => 
          p.htsTokenId && (p.status === 'LISTED' || p.status === 'MINTED')
        );
        setAvailableParcels(eligibleParcels);

        // If a specific parcel is selected, load its details
        if (selectedParcelId) {
          const parcelResponse = await getParcelDetails(selectedParcelId);
          setSelectedParcel(parcelResponse.parcel);
        }
      } catch (error) {
        console.error('Failed to load loan data:', error);
      }
    };

    loadData();
  }, [selectedParcelId, fetchMyParcels, getParcelDetails]);

  const handleCreateLoan = async (loanData: { principalUsd: number; ltvBps: number }) => {
    if (!selectedParcel) {
      toast.error('Veuillez sélectionner une parcelle comme collatéral');
      return;
    }

    try {
      await createLoan({
        parcelId: selectedParcel.id,
        principalAmount: loanData.principalUsd,
        ltvBps: loanData.ltvBps,
      });
    } catch (error) {
      console.error('Failed to create loan:', error);
    }
  };

  const handleRepayLoan = async (loanId: string) => {
    try {
      await repayLoan(loanId);
    } catch (error) {
      console.error('Failed to repay loan:', error);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 relative">
      <BeninPatternBackground className="fixed inset-0" />
      
      <div className="relative pt-8 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="font-heading text-3xl font-bold text-white mb-2">
              Prêts DeFi
            </h1>
            <p className="text-gray-400">
              Obtenez des liquidités en utilisant vos parcelles comme collatéral
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            {/* Parcel Selection */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardContent>
                  <h3 className="font-heading text-xl font-semibold text-white mb-6">
                    Sélectionner le Collatéral
                  </h3>
                  
                  {availableParcels.length === 0 ? (
                    <div className="text-center py-8">
                      <CreditCard className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                      <h4 className="font-medium text-white mb-2">Aucune parcelle éligible</h4>
                      <p className="text-gray-400 text-sm mb-4">
                        Vous devez avoir des parcelles tokenisées pour créer un prêt
                      </p>
                      <Link to="/mint">
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Tokeniser une Parcelle
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {availableParcels.map((parcel) => (
                        <div
                          key={parcel.id}
                          onClick={() => setSelectedParcel(parcel)}
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
                                {formatArea(parcel.areaM2)} • {parcel.priceUsd ? formatCurrency(parcel.priceUsd) : 'Prix non défini'}
                              </p>
                            </div>
                            <Badge variant={parcel.status === 'LISTED' ? 'success' : 'default'}>
                              {parcel.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Loan Calculator */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <LoanSimulator 
                onCreateLoan={handleCreateLoan}
                selectedParcelId={selectedParcel?.id}
                selectedParcelValue={selectedParcel?.priceUsd}
              />
            </motion.div>
          </div>

          {/* Active Loans */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardContent>
                <h3 className="font-heading text-xl font-semibold text-white mb-6">
                  Mes Prêts ({loans.length})
                </h3>
                
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse p-4 bg-dark-700/30 rounded-lg">
                        <div className="h-4 bg-dark-600/50 rounded mb-3" />
                        <div className="grid grid-cols-2 gap-3">
                          <div className="h-3 bg-dark-600/50 rounded" />
                          <div className="h-3 bg-dark-600/50 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : loans.length === 0 ? (
                  <div className="text-center py-8">
                    <DollarSign className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <h4 className="font-medium text-white mb-2">Aucun prêt actif</h4>
                    <p className="text-gray-400 text-sm">
                      Sélectionnez une parcelle et utilisez le simulateur pour créer votre premier prêt
                    </p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {loans.map((loan, index) => (
                      <LoanCard
                        key={loan.id}
                        loan={loan}
                        onRepay={handleRepayLoan}
                        index={index}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default MyParcelsPage;