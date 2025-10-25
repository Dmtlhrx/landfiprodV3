import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  MapPin, 
  DollarSign, 
  FileCheck, 
  TrendingUp, 
  Plus,
  Activity,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { Button, StatKPI, Card, CardContent, Badge, BeninPatternBackground } from '@hedera-africa/ui';
import Header from '@/components/Layout/Header';
import ActivityFeed from '@/components/ActivityFeed';
import ParcelCard from '@/components/ParcelCard';
import { useAuthStore } from '@/store/authStore';
import { useParcels } from '@/hooks/useParcels';
import { useP2PLoans } from '@/hooks/useLoans';
import { Parcel } from '@hedera-africa/ui';
import { formatCurrency } from '@/utils/formatters';

const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { fetchMyParcels, listParcel, delistParcel } = useParcels();
  const { loans } = useP2PLoans();
  const [myParcels, setMyParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
  
    const loadData = async () => {
      try {
        const parcels = await fetchMyParcels();
        if (mounted) setMyParcels(parcels);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };
  
    loadData();
  
    return () => {
      mounted = false;
    };
  }, [fetchMyParcels]);

  // Calculate real stats from data
  const portfolioValue = myParcels.reduce((sum, p) => sum + (p.priceUsd || 0), 0);
  const activeLoans = loans.filter(l => l.status === 'ACTIVE').length;
  const mintedParcels = myParcels.filter(p => p.htsTokenId).length;
  const listedParcels = myParcels.filter(p => p.status === 'LISTED').length;
  
  const stats = [
    {
      title: 'My Parcels',
      value: myParcels.length.toString(),
      icon: MapPin,
      trend: { value: 15.3, isPositive: true },
    },
    {
      title: 'Portfolio Value',
      value: formatCurrency(portfolioValue),
      icon: DollarSign,
      trend: { value: 8.2, isPositive: true },
    },
    {
      title: 'For Sale',
      value: listedParcels.toString(),
      icon: FileCheck,
      trend: { value: 12.5, isPositive: true },
    },
    {
      title: 'Tokenized',
      value: mintedParcels.toString(),
      icon: TrendingUp,
      trend: { value: 4.1, isPositive: true },
    },
  ];

  // Get recent activities from parcels
  const recentActivities = myParcels
    .flatMap(p => p.activities || [])
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

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

  return (
    <div className="min-h-screen bg-dark-950 relative">
      <BeninPatternBackground className="fixed inset-0" />
      <Header />  {/* header always visible */}
      
      <div className="relative pt-8 pb-12">
        {loading ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* skeleton / loader */}
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-dark-700/30 rounded w-1/3" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-32 bg-dark-700/30 rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Welcome Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <h1 className="font-heading text-3xl font-bold text-white mb-2">
                Hello, {user?.displayName} 
              </h1>
              <p className="text-gray-400">
                Here's an overview of your land portfolio
              </p>
            </motion.div>

            {/* Stats Grid */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <StatKPI {...stat} />
                </motion.div>
              ))}
            </motion.div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card>
                  <CardContent>
                    <h3 className="font-heading text-xl font-semibold text-white mb-6">
                      Quick Actions
                    </h3>
                    <div className="space-y-3">
                      <Link to="/mint" className="block">
                        <Button variant="outline" className="w-full justify-start">
                          <Plus className="h-4 w-4 mr-3" />
                          Tokenize a Parcel
                        </Button>
                      </Link>
                      <Link to="/marketplace" className="block">
                        <Button variant="outline" className="w-full justify-start">
                          <MapPin className="h-4 w-4 mr-3" />
                          Explore Market
                        </Button>
                      </Link>
                      <Link to="/loans" className="block">
                        <Button variant="outline" className="w-full justify-start">
                          <DollarSign className="h-4 w-4 mr-3" />
                          Request a Loan
                        </Button>
                      </Link>
                      <Link to="/activity" className="block">
                        <Button variant="outline" className="w-full justify-start">
                          <Activity className="h-4 w-4 mr-3" />
                          View Activity
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* My Parcels */}
              <div className="lg:col-span-2">
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card>
                    <CardContent>
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="font-heading text-xl font-semibold text-white">
                          My Parcels ({myParcels.length})
                        </h3>
                        <Link to="/mint">
                          <Button size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add
                          </Button>
                        </Link>
                      </div>
                      
                      {myParcels.length === 0 ? (
                        <div className="text-center py-8">
                          <MapPin className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                          <h4 className="font-medium text-white mb-2">No parcels</h4>
                          <p className="text-gray-400 text-sm mb-4">
                            Start by tokenizing your first parcel
                          </p>
                          <Link to="/mint">
                            <Button>
                              <Plus className="h-4 w-4 mr-2" />
                              Tokenize a Parcel
                            </Button>
                          </Link>
                        </div>
                      ) : (
                        <div className="grid md:grid-cols-2 gap-4">
                          {myParcels.slice(0, 4).map((parcel, index) => (
                            <ParcelCard
                              key={parcel.id}
                              parcel={parcel}
                              index={index}
                              showOwnerActions={true}
                              onList={handleListParcel}
                              onDelist={handleDelistParcel}
                            />
                          ))}
                        </div>
                      )}
                      
                      {myParcels.length > 4 && (
                        <div className="text-center mt-6">
                          <Link to="/my-parcels">
                            <Button variant="outline">
                              View All My Parcels ({myParcels.length})
                            </Button>
                          </Link>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-8"
            >
              <ActivityFeed activities={recentActivities} />
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;