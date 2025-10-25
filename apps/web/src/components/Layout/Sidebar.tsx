import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Store, DollarSign, Settings, Shield, Plus, Activity, X, MapPin, Zap, Vote } from 'lucide-react';
import { Button } from '@hedera-africa/ui';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@hedera-africa/ui';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { user } = useAuthStore();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Marketplace', href: '/marketplace', icon: Store },
    { name: 'My Parcels', href: '/my-parcels', icon: MapPin },
    { name: 'P2P Loans', href: '/p2p-loans', icon: DollarSign },
    { name: 'Express Loans', href: '/express-loans', icon: Zap },
    { name: 'Verification', href: '/verification', icon: Shield },
    { name: 'Tokenize', href: '/mint', icon: Plus },
    { name: 'Voting', href: '/votingpage', icon: Vote },
    { name: 'Activity', href: '/activity', icon: Activity },
  ];

  const adminNavigation = [
    { name: 'Administration', href: '/admin', icon: Shield },
  ];

  const bottomNavigation = [
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 h-full w-64 glass border-r border-dark-600/30 z-50 lg:relative lg:translate-x-0"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-dark-600/30">
                <div className="flex items-center gap-3 group">
                  <motion.div 
                    className="w-8 h-8 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary-500/50"
                    whileHover={{ scale: 1.05 }}
                  >
                    <span className="text-white font-bold">H</span>
                  </motion.div>
                  <span className="font-heading font-bold text-white transition-colors duration-300 group-hover:text-primary-400">
                    Hedera Africa
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden transition-all duration-200 hover:bg-dark-700/50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 p-4 space-y-2">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 group',
                      isActive(item.href)
                        ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                        : 'text-gray-300 hover:text-white hover:bg-dark-700/50'
                    )}
                  >
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <item.icon className="h-5 w-5 transition-colors duration-300" />
                    </motion.div>
                    <span className="font-medium">{item.name}</span>
                    {item.href === '/votingpage' && (
                      <motion.div 
                        className="ml-auto"
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <div className="w-2 h-2 rounded-full bg-primary-400" />
                      </motion.div>
                    )}
                  </Link>
                ))}

                {/* Admin Section */}
                {user?.role === 'ADMIN' && (
                  <>
                    <div className="pt-4 mt-4 border-t border-dark-600/30">
                      <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-2 transition-colors duration-300">
                        Administration
                      </p>
                      {adminNavigation.map((item) => (
                        <Link
                          key={item.name}
                          to={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 group',
                            isActive(item.href)
                              ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30'
                              : 'text-gray-300 hover:text-white hover:bg-dark-700/50'
                          )}
                        >
                          <motion.div
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            transition={{ duration: 0.2 }}
                          >
                            <item.icon className="h-5 w-5 transition-colors duration-300" />
                          </motion.div>
                          <span className="font-medium">{item.name}</span>
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </nav>

              {/* Bottom Navigation */}
              <div className="p-4 border-t border-dark-600/30">
                {bottomNavigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 group',
                      isActive(item.href)
                        ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                        : 'text-gray-300 hover:text-white hover:bg-dark-700/50'
                    )}
                  >
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <item.icon className="h-5 w-5 transition-colors duration-300" />
                    </motion.div>
                    <span className="font-medium">{item.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;