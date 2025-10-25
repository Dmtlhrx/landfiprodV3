import React from 'react';
import { Wallet, LogOut } from 'lucide-react';
import { Button } from './Button';
import { Badge } from './Badge';

interface WalletConnectButtonProps {
  isConnected: boolean;
  accountId?: string;
  network?: string;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const WalletConnectButton: React.FC<WalletConnectButtonProps> = ({
  isConnected,
  accountId,
  network,
  onConnect,
  onDisconnect,
}) => {
  if (isConnected && accountId) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="success" size="sm">
            {network || 'testnet'}
          </Badge>
          <span className="text-sm text-gray-300 font-mono">
            {accountId.slice(0, 8)}...{accountId.slice(-6)}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={onDisconnect}>
          <LogOut className="h-4 w-4 mr-2" />
          Déconnecter
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={onConnect}>
      <Wallet className="h-4 w-4 mr-2" />
      Connecter HashPack
    </Button>
  );
};