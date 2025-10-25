import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, X, MapPin, DollarSign, Ruler } from 'lucide-react';
import { Button, Card, CardContent, Badge } from '@hedera-africa/ui';
import { formatCurrency, formatArea } from '@/utils/formatters';

import { cn } from '@hedera-africa/ui';

interface FilterState {
  search: string;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  status?: string;
  location?: string;
}

interface SearchFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  className?: string;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  filters,
  onFiltersChange,
  className,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilter = (key: keyof FilterState, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({ search: '' });
    setShowAdvanced(false);
  };

  const activeFiltersCount = Object.entries(filters).filter(
    ([key, value]) => key !== 'search' && value !== undefined && value !== ''
  ).length;

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par titre, ville, propriétaire..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-dark-700/30 rounded-xl text-white placeholder-gray-400 border border-dark-600/30 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtres Avancés
              {activeFiltersCount > 0 && (
                <Badge variant="primary" size="sm">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>

            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Effacer
              </Button>
            )}
          </div>

          {/* Advanced Filters */}
          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4 pt-4 border-t border-dark-600/30"
              >
                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    <DollarSign className="h-4 w-4 inline mr-2" />
                    Fourchette de Prix
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      placeholder="Prix min"
                      value={filters.minPrice || ''}
                      onChange={(e) => updateFilter('minPrice', e.target.value ? Number(e.target.value) : undefined)}
                      className="px-3 py-2 bg-dark-700/30 rounded-lg text-white placeholder-gray-400 border border-dark-600/30 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                    <input
                      type="number"
                      placeholder="Prix max"
                      value={filters.maxPrice || ''}
                      onChange={(e) => updateFilter('maxPrice', e.target.value ? Number(e.target.value) : undefined)}
                      className="px-3 py-2 bg-dark-700/30 rounded-lg text-white placeholder-gray-400 border border-dark-600/30 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                </div>

                {/* Area Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    <Ruler className="h-4 w-4 inline mr-2" />
                    Superficie (m²)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      placeholder="Surface min"
                      value={filters.minArea || ''}
                      onChange={(e) => updateFilter('minArea', e.target.value ? Number(e.target.value) : undefined)}
                      className="px-3 py-2 bg-dark-700/30 rounded-lg text-white placeholder-gray-400 border border-dark-600/30 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                    <input
                      type="number"
                      placeholder="Surface max"
                      value={filters.maxArea || ''}
                      onChange={(e) => updateFilter('maxArea', e.target.value ? Number(e.target.value) : undefined)}
                      className="px-3 py-2 bg-dark-700/30 rounded-lg text-white placeholder-gray-400 border border-dark-600/30 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Statut
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['DRAFT', 'LISTED', 'SOLD', 'COLLATERALIZED'].map((status) => (
                      <button
                        key={status}
                        onClick={() => updateFilter('status', filters.status === status ? undefined : status)}
                        className={cn(
                          'px-3 py-2 rounded-lg text-sm font-medium transition-all',
                          filters.status === status
                            ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                            : 'bg-dark-700/30 text-gray-400 border border-dark-600/30 hover:border-primary-500/30'
                        )}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
};

export default SearchFilters;