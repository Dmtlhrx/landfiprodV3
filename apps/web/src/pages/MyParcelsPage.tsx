import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MapPin, Plus, Filter, Grid, List } from 'lucide-react';
import { Button, Card, CardContent, BeninPatternBackground, EmptyState } from '@hedera-africa/ui';
import Header from '@/components/Layout/Header';
import ParcelCard from '@/components/ParcelCard';
import { useParcels } from '@/hooks/useParcels';
import { Parcel } from '@hedera-africa/ui';

const MyParcelsPage: React.FC = () => {
  const [myParcels, setMyParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const { fetchMyParcels, listParcel, delistParcel } = useParcels();

  useEffect(() => {
    const loadParcels = async () => {
      try {
        const parcels = await fetchMyParcels();
        setMyParcels(parcels);
      } catch (error) {
        console.error('Failed to load parcels:', error);
      } finally {
        setLoading(false);
      }
    };

    loadParcels();
  }, [fetchMyParcels]);

  const handleListParcel = async (parcelId: string, priceUsd: number) => {
    try {
      await listParcel(parcelId, priceUsd);
      // Refresh data
      const updatedParcels = await fetchMyParcels();
      setMyParcels(updatedParcels);
    } catch (error) {
      console.error('Failed to list parcel:', error);
    }
  };

  const handleDelistParcel = async (parcelId: string) => {
    try {
      await delistParcel(parcelId);
      // Refresh data
      const updatedParcels = await fetchMyParcels();
      setMyParcels(updatedParcels);
    } catch (error) {
      console.error('Failed to delist parcel:', error);
    }
  };

  const handleUseAsCollateral = (parcelId: string) => {
    window.location.href = `/loans?parcelId=${parcelId}`;
  };

  const filteredParcels = myParcels.filter(parcel => {
    if (statusFilter === 'all') return true;
    return parcel.status === statusFilter;
  });

  const statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'MINTED', label: 'Minted' },

    { value: 'DRAFT', label: 'Drafts' },
    { value: 'LISTED', label: 'For Sale' },
    { value: 'SOLD', label: 'Sold' },
    { value: 'COLLATERALIZED', label: 'Collateral' },
  ];

  return (
    <div className="min-h-screen bg-dark-950 relative">
      <BeninPatternBackground className="fixed inset-0" />
      <Header />
      
      <div className="relative pt-8 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary-500/20 rounded-xl">
                  <MapPin className="h-8 w-8 text-primary-400" />
                </div>
                <div>
                  <h1 className="font-heading text-3xl font-bold text-white">
                    My Parcels
                  </h1>
                  <p className="text-gray-400">
                    {filteredParcels.length} parcel(s) in your portfolio
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link to="/mint">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Parcel
                  </Button>
                </Link>
                
                <div className="flex bg-dark-700/30 rounded-lg p-1">
                  <Button
                    variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-300">Filter by status:</span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setStatusFilter(option.value)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        statusFilter === option.value
                          ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                          : 'bg-dark-700/30 text-gray-400 border border-dark-600/30 hover:border-primary-500/30'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Loading State */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <Card>
                    <div className="aspect-video bg-dark-700/30" />
                    <CardContent>
                      <div className="space-y-3">
                        <div className="h-4 bg-dark-600/50 rounded" />
                        <div className="h-3 bg-dark-600/50 rounded w-2/3" />
                        <div className="h-3 bg-dark-600/50 rounded w-1/2" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredParcels.length === 0 && (
            <EmptyState
              icon={MapPin}
              title="No parcels found"
              description={
                statusFilter === 'all' 
                  ? "You don't have any parcels yet. Start by tokenizing your first property."
                  : `No parcels with status "${statusOptions.find(o => o.value === statusFilter)?.label}".`
              }
              action={{
                label: statusFilter === 'all' ? 'Tokenize a Parcel' : 'View All',
                onClick: () => statusFilter === 'all' ? window.location.href = '/mint' : setStatusFilter('all'),
              }}
            />
          )}

          {/* Parcels Grid */}
          {!loading && filteredParcels.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                  : 'space-y-4'
              }
            >
              {filteredParcels.map((parcel, index) => (
                <ParcelCard
                  key={parcel.id}
                  parcel={parcel}
                  index={index}
                  viewMode={viewMode}
                  showOwnerActions={true}
                  onList={handleListParcel}
                  onDelist={handleDelistParcel}
                  onUseAsCollateral={handleUseAsCollateral}
                />
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyParcelsPage;