import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Store, Filter, Grid, List } from 'lucide-react';
import { Button, Card, CardContent, BeninPatternBackground, EmptyState } from '@hedera-africa/ui';
import Header from '@/components/Layout/Header';
import ParcelCard from '@/components/ParcelCard';
import SearchFilters from '@/components/SearchFilters';
import { useApi } from '@/hooks/useApi';
import { Parcel } from '@hedera-africa/ui';
import { useDebounce } from '@/hooks/useDebounce';

interface FilterState {
  search: string;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  status?: string;
}

const MarketplacePage: React.FC = () => {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [filters, setFilters] = useState<FilterState>({ search: '' });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  
  const api = useApi<{ parcels: Parcel[] }>();
  const debouncedFilters = useDebounce(filters, 500);

  const handleBuyParcel = async (parcelId: string) => {
    try {
      await buyParcel(parcelId);
      // Refresh parcels after purchase
      await fetchParcels();
    } catch (error) {
      console.error('Failed to buy parcel:', error);
    }
  };

  const fetchParcels = async () => {
    try {
      const queryParams = new URLSearchParams();
      
      if (debouncedFilters.search) queryParams.set('search', debouncedFilters.search);
      if (debouncedFilters.minPrice) queryParams.set('minPrice', debouncedFilters.minPrice.toString());
      if (debouncedFilters.maxPrice) queryParams.set('maxPrice', debouncedFilters.maxPrice.toString());
      if (debouncedFilters.minArea) queryParams.set('minArea', debouncedFilters.minArea.toString());
      if (debouncedFilters.maxArea) queryParams.set('maxArea', debouncedFilters.maxArea.toString());
      if (debouncedFilters.status) queryParams.set('status', debouncedFilters.status);

      const response = await api.get(`api/parcels?${queryParams.toString()}`);
      setParcels(response.parcels);
    } catch (error) {
      console.error('Failed to fetch parcels:', error);
    }
  };

  useEffect(() => {
    fetchParcels();
  }, [debouncedFilters]);

  const availableParcels = parcels.filter(p => p.status === 'LISTED' && p.priceUsd);

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
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    {/* Left section */}
    <div className="flex items-center gap-3">
      <div className="p-3 bg-primary-500/20 rounded-xl">
        <Store className="h-8 w-8 text-primary-400" />
      </div>
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white">
          Marketplace
        </h1>
        <p className="text-gray-400 text-sm sm:text-base">
          {availableParcels.length} parcel(s) available
        </p>
      </div>
    </div>

    {/* Right section */}
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
      <Button
        variant="outline"
        onClick={() => setShowFilters(!showFilters)}
        className="flex items-center gap-2 w-full sm:w-auto"
      >
        <Filter className="h-4 w-4" />
        Filters
      </Button>

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
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8"
            >
              <SearchFilters
                filters={filters}
                onFiltersChange={setFilters}
              />
            </motion.div>
          )}

          {/* Loading State */}
          {api.loading && (
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
          {!api.loading && availableParcels.length === 0 && (
            <EmptyState
              icon={Store}
              title="No parcels available"
              description="There are currently no parcels matching your search criteria."
              action={{
                label: 'Clear filters',
                onClick: () => setFilters({ search: '' }),
              }}
            />
          )}

          {/* Parcels Grid */}
          {!api.loading && availableParcels.length > 0 && (
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
              {availableParcels.map((parcel, index) => (
                <ParcelCard
                  key={parcel.id}
                  parcel={parcel}
                  index={index}
                  viewMode={viewMode}
                  onBuy={handleBuyParcel}
                />
              ))}
            </motion.div>
          )}

          {/* Load More */}
          {availableParcels.length > 0 && availableParcels.length % 12 === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center mt-12"
            >
              <Button variant="outline" onClick={fetchParcels}>
                Load More Parcels
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketplacePage;