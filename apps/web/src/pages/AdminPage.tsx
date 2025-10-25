import React from 'react';
import { motion } from 'framer-motion';
import { Users, Settings, Activity, BarChart } from 'lucide-react';
import { Card, CardContent, StatKPI, Badge, BeninPatternBackground } from '@hedera-africa/ui';
import Header from '@/components/Layout/Header';

const AdminPage: React.FC = () => {
  const stats = [
    {
      title: 'Active Users',
      value: '1,234',
      icon: Users,
      trend: { value: 12.5, isPositive: true },
    },
    {
      title: 'Tokenized Parcels',
      value: '2,847',
      icon: BarChart,
      trend: { value: 8.3, isPositive: true },
    },
    {
      title: 'Total Volume',
      value: '$12.4M',
      icon: Activity,
      trend: { value: 15.7, isPositive: true },
    },
    {
      title: 'Fees Collected',
      value: '$48.2K',
      icon: Settings,
      trend: { value: 22.1, isPositive: true },
    },
  ];

  const recentUsers = [
    {
      id: '1',
      displayName: 'Marie Adjoua',
      email: 'marie.adjoua@email.com',
      status: 'VERIFIED',
      parcels: 3,
      joinedAt: '2025-01-12',
    },
    {
      id: '2', 
      displayName: 'Koffi Mensah',
      email: 'koffi.mensah@email.com',
      status: 'PENDING',
      parcels: 1,
      joinedAt: '2025-01-13',
    },
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
            <h1 className="font-heading text-3xl font-bold text-white mb-2">
              Administration
            </h1>
            <p className="text-gray-400">
              Platform management and moderation
            </p>
          </motion.div>

          {/* Stats */}
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

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Recent Users */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardContent>
                  <h3 className="font-heading text-xl font-semibold text-white mb-6">
                    Recent Users
                  </h3>
                  <div className="space-y-4">
                    {recentUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 bg-dark-700/30 rounded-lg border border-dark-600/20"
                      >
                        <div>
                          <h4 className="font-medium text-white">{user.displayName}</h4>
                          <p className="text-gray-400 text-sm">{user.email}</p>
                          <p className="text-gray-500 text-xs">
                            {user.parcels} parcel(s) • Joined on {user.joinedAt}
                          </p>
                        </div>
                        <Badge 
                          variant={user.status === 'VERIFIED' ? 'success' : 'warning'}
                        >
                          {user.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* System Config */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardContent>
                  <h3 className="font-heading text-xl font-semibold text-white mb-6">
                    System Configuration
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-dark-700/30 rounded-lg">
                      <div>
                        <h4 className="font-medium text-white">Transaction Fees</h4>
                        <p className="text-gray-400 text-sm">Commission on sales</p>
                      </div>
                      <Badge>2.5%</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-dark-700/30 rounded-lg">
                      <div>
                        <h4 className="font-medium text-white">Base DeFi Rate</h4>
                        <p className="text-gray-400 text-sm">Minimum APR for loans</p>
                      </div>
                      <Badge variant="warning">7.5%</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-dark-700/30 rounded-lg">
                      <div>
                        <h4 className="font-medium text-white">HCS Topic</h4>
                        <p className="text-gray-400 text-sm font-mono">Status: Active</p>
                      </div>
                      <Badge variant="success">0.0.789456</Badge>
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

export default AdminPage;