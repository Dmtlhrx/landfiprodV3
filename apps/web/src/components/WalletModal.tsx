import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, ExternalLink, Download } from 'lucide-react';
import { Modal, Button, Badge } from '@hedera-africa/ui';
import { useHashPack } from '@/hooks/useHashPack';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
  const { isAvailable, isConnecting, connect } = useHashPack();

  const handleConnect = async () => {
    await connect();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Connecter votre Wallet"
      size="md"
    >
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl mx-auto mb-4 flex items-center justify-center">
            <Wallet className="h-8 w-8 text-white" />
          </div>
          <h3 className="font-heading text-xl font-semibold text-white mb-2">
            HashPack Wallet
          </h3>
          <p className="text-gray-400">
            Connectez votre wallet HashPack pour interagir avec Hedera
          </p>
        </div>

        {!isAvailable ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <div className="p-4 bg-secondary-500/10 border border-secondary-500/30 rounded-lg">
              <p className="text-secondary-400 font-medium mb-2">
                HashPack non détecté
              </p>
              <p className="text-gray-400 text-sm">
                Veuillez installer l'extension HashPack pour continuer
              </p>
            </div>
            
            <a
              href="https://www.hashpack.app/download"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Télécharger HashPack
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </a>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="p-4 bg-primary-500/10 border border-primary-500/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-primary-400 font-medium">HashPack Détecté</span>
                <Badge variant="success" size="sm">Disponible</Badge>
              </div>
              <p className="text-gray-400 text-sm">
                Cliquez pour connecter votre wallet et commencer à utiliser la plateforme
              </p>
            </div>
            
            <Button
              onClick={handleConnect}
              isLoading={isConnecting}
              className="w-full neon-glow-hover"
              size="lg"
            >
              <Wallet className="h-5 w-5 mr-2" />
              {isConnecting ? 'Connexion...' : 'Connecter HashPack'}
            </Button>
            
            <p className="text-gray-500 text-xs text-center">
              En vous connectant, vous acceptez nos conditions d'utilisation
            </p>
          </motion.div>
        )}
      </div>
    </Modal>
  );
};

export default WalletModal;