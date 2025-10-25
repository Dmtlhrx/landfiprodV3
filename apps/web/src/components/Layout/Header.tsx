import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Menu, 
  X, 
  User, 
  LogOut, 
  Settings, 
  Bell,
  Wallet,
  Shield,
  Activity,
  ChevronDown,
  Store,
  DollarSign,
  Zap,
  Vote
} from 'lucide-react';
import { Button, Badge, Avatar, NetworkIndicator, WalletConnectButton } from '@hedera-africa/ui';
import NotificationCenter from '../NotificationCenter';
import WalletModal from '../WalletModal';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useWallet } from '@/hooks/useWallet';

const Header: React.FC = () => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const navigate = useNavigate();
  
  const { user, logout, wallet } = useAuthStore();
  const { sidebarOpen, setSidebarOpen, notifications } = useUIStore();
  const { connectWallet, disconnectWallet } = useWallet();

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = () => {
    logout();
    navigate('/');
    setShowUserMenu(false);
  };

  const handleWalletConnect = async () => {
    try {
      await connectWallet();
      setShowWalletModal(false);
    } catch (error) {
      console.error('Wallet connection failed:', error);
    }
  };

  const handleWalletDisconnect = () => {
    disconnectWallet();
    setShowUserMenu(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-dark-900/80 backdrop-blur-xl border-b border-dark-600/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left Side - Logo & Menu */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden transition-all duration-200 hover:bg-dark-700/50"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>

              <Link to="/dashboard" className="flex items-center gap-3 group">
                <motion.div 
                  className="w-8 h-8 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary-500/50"
                  whileHover={{ scale: 1.05 }}
                >
                  <span className="text-white font-bold text-sm">H</span>
                </motion.div>
                <span className="font-heading font-bold text-white text-lg hidden sm:block transition-colors duration-300 group-hover:text-primary-400">
                  Hedera LandFi
                </span>
              </Link>
            </div>

            {/* Center - Navigation (Desktop) */}
            <nav className="hidden lg:flex items-center gap-6">
              <Link
                to="/marketplace"
                className="flex items-center gap-2 text-gray-300 hover:text-primary-400 transition-all duration-300 font-medium group relative"
              >
                <Store className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                <span>Marketplace</span>
                <motion.div 
                  className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-primary-500 to-secondary-500 w-0 group-hover:w-full transition-all duration-300"
                />
              </Link>
              <Link
                to="/p2p-loans"
                className="flex items-center gap-2 text-gray-300 hover:text-primary-400 transition-all duration-300 font-medium group relative"
              >
                <DollarSign className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                <span>P2P Loans</span>
                <motion.div 
                  className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-primary-500 to-secondary-500 w-0 group-hover:w-full transition-all duration-300"
                />
              </Link>
              <Link
                to="/express-loans"
                className="flex items-center gap-2 text-gray-300 hover:text-primary-400 transition-all duration-300 font-medium group relative"
              >
                <Zap className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                <span>Express Loans</span>
                <motion.div 
                  className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-primary-500 to-secondary-500 w-0 group-hover:w-full transition-all duration-300"
                />
              </Link>
              <Link
                to="/verification"
                className="flex items-center gap-2 text-gray-300 hover:text-primary-400 transition-all duration-300 font-medium group relative"
              >
                <Shield className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                <span>Verification</span>
                <motion.div 
                  className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-primary-500 to-secondary-500 w-0 group-hover:w-full transition-all duration-300"
                />
              </Link>
              <Link
                to="/votingpage"
                className="flex items-center gap-2 text-gray-300 hover:text-primary-400 transition-all duration-300 font-medium group relative"
              >
                <Vote className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                <span>Voting</span>
                <motion.div 
                  className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-primary-500 to-secondary-500 w-0 group-hover:w-full transition-all duration-300"
                />
              </Link>
            </nav>

            {/* Right Side - Wallet & User */}
            <div className="flex items-center gap-3">
              {/* Network Indicator */}
              {wallet.isConnected && (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                >
                  <NetworkIndicator
                    isConnected={wallet.isConnected}
                    network={wallet.network}
                  />
                </motion.div>
              )}

              {/* Wallet Connection */}
              {!wallet.isConnected ? (
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowWalletModal(true)}
                    className="hidden sm:flex transition-all duration-300 hover:border-primary-500/50 hover:bg-primary-500/10"
                  >
                    <Wallet className="h-4 w-4 mr-2" />
                    Connect Wallet
                  </Button>
                </motion.div>
              ) : (
                <motion.div 
                  className="hidden sm:flex items-center gap-2 px-3 py-2 bg-primary-500/20 border border-primary-500/30 rounded-lg transition-all duration-300 hover:bg-primary-500/30 hover:border-primary-500/50 cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                >
                  <Shield className="h-4 w-4 text-primary-400" />
                  <span className="text-primary-400 font-mono text-sm">
                    {wallet.accountId?.slice(0, 6)}...{wallet.accountId?.slice(-4)}
                  </span>
                </motion.div>
              )}

              {/* Notifications */}
              <div className="relative">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <NotificationCenter />
                </motion.div>
              </div>

              {/* User Menu */}
              <div className="relative">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 transition-all duration-300 hover:bg-dark-700/50"
                  >
                    <Avatar 
                      fallback={user?.displayName?.charAt(0)} 
                      size="sm"
                    />
                    <span className="hidden sm:block text-white font-medium">
                      {user?.displayName}
                    </span>
                    <motion.div
                      animate={{ rotate: showUserMenu ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </motion.div>
                  </Button>
                </motion.div>

                {/* User Dropdown */}
                {showUserMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowUserMenu(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 top-full mt-2 w-64 bg-dark-900/95 backdrop-blur-xl border border-dark-600/50 rounded-xl shadow-2xl z-50"
                    >
                      <div className="p-4 border-b border-dark-600/30">
                        <div className="flex items-center gap-3">
                          <Avatar 
                            fallback={user?.displayName?.charAt(0)} 
                            size="md"
                          />
                          <div>
                            <p className="font-medium text-white">{user?.displayName}</p>
                            <p className="text-gray-400 text-sm">{user?.email}</p>
                          </div>
                        </div>
                        
                        {wallet.isConnected && (
                          <motion.div 
                            className="mt-3 p-2 bg-primary-500/10 border border-primary-500/30 rounded-lg transition-all duration-300 hover:bg-primary-500/20 hover:border-primary-500/50"
                            whileHover={{ scale: 1.02 }}
                          >
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-primary-400" />
                              <span className="text-primary-400 text-sm font-medium">Wallet Connected</span>
                            </div>
                            <p className="text-gray-400 text-xs font-mono mt-1">
                              {wallet.accountId}
                            </p>
                          </motion.div>
                        )}
                      </div>

                      <div className="p-2">
                        <Link
                          to="/dashboard"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-dark-700/50 rounded-lg transition-all duration-300"
                        >
                          <User className="h-4 w-4" />
                          Dashboard
                        </Link>
                        
                        <Link
                          to="/my-parcels"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-dark-700/50 rounded-lg transition-all duration-300"
                        >
                          <Activity className="h-4 w-4" />
                          My Parcels
                        </Link>
                        
                        <Link
                          to="/settings"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-dark-700/50 rounded-lg transition-all duration-300"
                        >
                          <Settings className="h-4 w-4" />
                          Settings
                        </Link>

                        {!wallet.isConnected ? (
                          <button
                            onClick={() => {
                              setShowWalletModal(true);
                              setShowUserMenu(false);
                            }}
                            className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-dark-700/50 rounded-lg transition-all duration-300 w-full"
                          >
                            <Wallet className="h-4 w-4" />
                            Connect Wallet
                          </button>
                        ) : (
                          <button
                            onClick={handleWalletDisconnect}
                            className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-dark-700/50 rounded-lg transition-all duration-300 w-full"
                          >
                            <Wallet className="h-4 w-4" />
                            Disconnect Wallet
                          </button>
                        )}
                      </div>

                      <div className="p-2 border-t border-dark-600/30">
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-300 w-full"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Wallet Modal */}
      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      />
    </>
  );
};

export default Header;