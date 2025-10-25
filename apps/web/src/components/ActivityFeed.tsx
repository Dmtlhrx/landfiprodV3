import React from 'react';
import { motion } from 'framer-motion';
import { 
  Coins, 
  Store, 
  DollarSign, 
  FileCheck, 
  ExternalLink,
  Clock
} from 'lucide-react';
import { Card, CardContent, Badge } from '@hedera-africa/ui';
import { Activity } from '@hedera-africa/ui';
import { formatDateTime } from '@/utils/formatters';
import {cn} from '@/utils/cn';

interface ActivityFeedProps {
  activities: Activity[];
  className?: string;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities, className }) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'MINTED':
        return Coins;
      case 'LISTED':
        return Store;
      case 'SOLD':
        return DollarSign;
      case 'LOAN_CREATED':
        return FileCheck;
      default:
        return Clock;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'MINTED':
        return 'text-primary-400';
      case 'LISTED':
        return 'text-secondary-400';
      case 'SOLD':
        return 'text-accent-400';
      case 'LOAN_CREATED':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'MINTED':
        return 'Tokenized';
      case 'LISTED':
        return 'Listed for sale';
      case 'SOLD':
        return 'Sold';
      case 'LOAN_CREATED':
        return 'Loan created';
      default:
        return type;
    }
  };

  if (activities.length === 0) {
    return (
      <Card className={className}>
        <CardContent>
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h3 className="font-medium text-white mb-2">No activity</h3>
            <p className="text-gray-400 text-sm">
              Your parcel activities will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent>
        <h3 className="font-heading text-xl font-semibold text-white mb-6">
          Recent Activity
        </h3>
        
        <div className="space-y-4">
          {activities.map((activity, index) => {
            const Icon = getActivityIcon(activity.type);
            const color = getActivityColor(activity.type);
            const label = getActivityLabel(activity.type);
            
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-4 p-4 bg-dark-700/30 rounded-lg border border-dark-600/20"
              >
                <div className={cn('p-2 rounded-lg bg-current/20', color)}>
                  <Icon className={cn('h-4 w-4', color)} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="default" size="sm">
                      {label}
                    </Badge>
                    <span className="text-gray-400 text-sm">
                      Parcel #{activity.parcelId.slice(-6)}
                    </span>
                  </div>
                  
                  <p className="text-gray-500 text-xs">
                    {formatDateTime(activity.createdAt)}
                  </p>
                </div>
                
                {activity.ref && (
                  <a
                    href={`https://hashscan.io/testnet/transaction/${activity.ref}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityFeed;