import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity as ActivityIcon, Filter, ExternalLink } from 'lucide-react';
import { Card, CardContent, Badge, BeninPatternBackground } from '@hedera-africa/ui';
import Header from '@/components/Layout/Header';
import ActivityFeed from '@/components/ActivityFeed';
import { useApi } from '@/hooks/useApi';
import { Activity } from '@hedera-africa/ui';
import { cn } from '@hedera-africa/ui';

const ActivityPage: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const api = useApi<{ activities: Activity[] }>();

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await api.get('api/users/activity');
        setActivities(response.activities);
      } catch (error) {
        console.error('Failed to fetch activities:', error);
      }
    };

    fetchActivities();
  }, []);

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    return activity.type === filter;
  });

  const activityTypes = [
    { value: 'all', label: 'Toutes' },
    { value: 'MINTED', label: 'Tokenisations' },
    { value: 'LISTED', label: 'Mises en vente' },
    { value: 'SOLD', label: 'Ventes' },
    { value: 'LOAN_CREATED', label: 'Prêts' },
  ];

  return (
    <div className="min-h-screen bg-dark-950 relative">
      <BeninPatternBackground className="fixed inset-0" />
      <Header />
      
      <div className="relative pt-8 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-primary-500/20 rounded-xl">
                <ActivityIcon className="h-8 w-8 text-primary-400" />
              </div>
              <div>
                <h1 className="font-heading text-3xl font-bold text-white">
                  Flux d'Activité
                </h1>
                <p className="text-gray-400">
                  Historique complet de vos transactions blockchain
                </p>
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
                  <span className="text-sm font-medium text-gray-300">Filtrer par type:</span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {activityTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setFilter(type.value)}
                      className={cn(
                        'px-3 py-2 rounded-lg text-sm font-medium transition-all',
                        filter === type.value
                          ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                          : 'bg-dark-700/30 text-gray-400 border border-dark-600/30 hover:border-primary-500/30'
                      )}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Activity Feed */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <ActivityFeed activities={filteredActivities} />
          </motion.div>

          {/* HCS Info */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8"
          >
            <Card>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-white mb-1">
                      Hedera Consensus Service
                    </h3>
                    <p className="text-gray-400 text-sm">
                      Toutes les activités sont enregistrées de manière immuable
                    </p>
                  </div>
                  <a
                    href="https://hashscan.io/testnet/topic/0.0.789456"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    <span className="text-sm font-mono">Topic 0.0.789456</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ActivityPage;