import React from 'react';
import { motion } from 'framer-motion';
import { User, Shield, Globe, Bell, AlertCircle } from 'lucide-react';
import { Button, Card, CardContent, BeninPatternBackground } from '@hedera-africa/ui';
import Header from '@/components/Layout/Header';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';

const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'fr' ? 'en' : 'fr';
    i18n.changeLanguage(newLang);
  };

  const showDevelopmentAlert = () => {
    alert('Under development - En cours de développement');
  };

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
            <h1 className="font-heading text-3xl font-bold text-white mb-2">
              Settings
            </h1>
            <p className="text-gray-400">
              Manage your profile and preferences
            </p>
          </motion.div>

          <div className="space-y-6">
            {/* Profile */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardContent>
                  <div className="flex items-center gap-3 mb-6">
                    <User className="h-5 w-5 text-primary-400" />
                    <h3 className="font-heading text-xl font-semibold text-white">
                      Profile
                    </h3>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Display Name
                      </label>
                      <input
                        type="text"
                        defaultValue={user?.displayName}
                        className="w-full px-4 py-3 bg-dark-700/30 rounded-xl text-white border border-dark-600/30 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        defaultValue={user?.email}
                        disabled
                        className="w-full px-4 py-3 bg-dark-700/30 rounded-xl text-gray-500 border border-dark-600/30 cursor-not-allowed"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-6">
                    <Button onClick={showDevelopmentAlert}>Save</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Security */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardContent>
                  <div className="flex items-center gap-3 mb-6">
                    <Shield className="h-5 w-5 text-secondary-400" />
                    <h3 className="font-heading text-xl font-semibold text-white">
                      Security
                    </h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-dark-700/30 rounded-lg">
                      <div>
                        <h4 className="font-medium text-white">Two-Factor Authentication</h4>
                        <p className="text-gray-400 text-sm">Enhanced security for your account</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={showDevelopmentAlert}>
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Setup
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-dark-700/30 rounded-lg">
                      <div>
                        <h4 className="font-medium text-white">Change Password</h4>
                        <p className="text-gray-400 text-sm">Updated 30 days ago</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={showDevelopmentAlert}>
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Change
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Preferences */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardContent>
                  <div className="flex items-center gap-3 mb-6">
                    <Globe className="h-5 w-5 text-accent-400" />
                    <h3 className="font-heading text-xl font-semibold text-white">
                      Preferences
                    </h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-dark-700/30 rounded-lg">
                      <div>
                        <h4 className="font-medium text-white">Language</h4>
                        <p className="text-gray-400 text-sm">
                          Currently: {i18n.language === 'fr' ? 'Français' : 'English'}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={toggleLanguage}>
                        {i18n.language === 'fr' ? 'English' : 'Français'}
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-dark-700/30 rounded-lg">
                      <div>
                        <h4 className="font-medium text-white">Notifications</h4>
                        <p className="text-gray-400 text-sm">Email and push notifications</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={showDevelopmentAlert}>
                        <Bell className="h-4 w-4 mr-2" />
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Manage
                      </Button>
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

export default SettingsPage;