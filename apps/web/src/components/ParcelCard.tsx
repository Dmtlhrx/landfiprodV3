import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, DollarSign, Ruler, Eye, ShoppingCart, CreditCard, List, ListX, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, Badge, Button, Modal } from '@hedera-africa/ui';
import VerificationBadge from './VerificationBadge';
import AIVerificationBadge from './AIVerificationBadgeProps ';
import { Parcel } from '@hedera-africa/ui';
import { formatCurrency, formatArea, formatTokenId } from '@/utils/formatters';
import { useAuthStore } from '@/store/authStore';

interface ParcelCardProps {
  parcel: Parcel;
  index?: number;
  viewMode?: 'grid' | 'list';
  showOwnerActions?: boolean;
  onBuy?: (parcelId: string) => void;
  onList?: (parcelId: string, priceUsd: number) => void;
  onDelist?: (parcelId: string) => void;
  onUseAsCollateral?: (parcelId: string) => void;
}

// Helper pour mapper les données parcel aux props du AIVerificationBadge
const getVerificationPropsFromParcel = (parcel: Parcel) => {
  const verificationDetails = parcel.verificationDetails || {};
  
  const statusMap: Record<string, 'PENDING' | 'PROCESSING' | 'VERIFIED' | 'FAILED' | 'SUSPICIOUS'> = {
    'PENDING': 'PENDING',
    'PROCESSING': 'PROCESSING',
    'VERIFIED': 'VERIFIED',
    'FAILED': 'FAILED',
    'SUSPICIOUS': 'SUSPICIOUS'
  };

  const status = statusMap[verificationDetails.status] || 'PENDING';

  const riskAssessmentMap: Record<string, 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN'> = {
    'VERY_LOW': 'VERY_LOW',
    'LOW': 'LOW',
    'MEDIUM': 'MEDIUM',
    'HIGH': 'HIGH',
    'CRITICAL': 'CRITICAL'
  };

  const riskLevel = riskAssessmentMap[parcel.riskAssessment] || 'UNKNOWN';
  const confidenceScore = verificationDetails.confidence || 70;
  const riskScore = 100 - confidenceScore;

  return {
    status,
    riskLevel,
    riskScore,
    confidenceScore,
  };
};

const ParcelCard: React.FC<ParcelCardProps> = ({ 
  parcel, 
  index = 0, 
  viewMode = 'grid',
  showOwnerActions = false,
  onBuy,
  onList,
  onDelist,
  onUseAsCollateral
}) => {
  const [showListModal, setShowListModal] = useState(false);
  const [showVerificationDetails, setShowVerificationDetails] = useState(false);
  const [listPrice, setListPrice] = useState(parcel.priceUsd || 50000);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const imageUrl = `https://images.pexels.com/photos/${1595108 + index}/pexels-photo-${1595108 + index}.jpeg?auto=compress&cs=tinysrgb&w=800`;
  
  const isOwner = user?.id === parcel.ownerId;
  const canList = isOwner && parcel.htsTokenId && parcel.status === 'DRAFT';
  const canDelist = isOwner && parcel.status === 'LISTED';
  const canUseAsCollateral = isOwner && parcel.htsTokenId && parcel.status === 'LISTED';
  const canBuy = !isOwner && parcel.status === 'LISTED' && parcel.priceUsd;

  const verificationProps = getVerificationPropsFromParcel(parcel);

  const handleList = async () => {
    if (onList && listPrice > 0) {
      setLoading(true);
      try {
        await onList(parcel.id, listPrice);
        setShowListModal(false);
      } catch (error) {
        console.error('Failed to list parcel:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDelist = async () => {
    if (onDelist) {
      setLoading(true);
      try {
        await onDelist(parcel.id);
      } catch (error) {
        console.error('Failed to delist parcel:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBuy = async () => {
    if (onBuy) {
      setLoading(true);
      try {
        await onBuy(parcel.id);
      } catch (error) {
        console.error('Failed to buy parcel:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleUseAsCollateral = async () => {
    navigate(`/p2p-loans/create?parcelId=${parcel.id}`);
  };

  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="group"
      >
        <Card hover className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex gap-6">
              <div className="w-48 h-32 flex-shrink-0 rounded-lg overflow-hidden">
                <img
                  src={imageUrl}
                  alt={parcel.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-heading text-xl font-semibold text-white line-clamp-1">
                    {parcel.title}
                  </h3>
                  <div className="flex gap-2">
                    <Badge variant="success">
                      {parcel.htsTokenId ? formatTokenId(parcel.htsTokenId) : 'DRAFT'}
                    </Badge>
                    <Badge variant={
                      parcel.status === 'LISTED' ? 'success' : 
                      parcel.status === 'SOLD' ? 'warning' :
                      parcel.status === 'COLLATERALIZED' ? 'error' : 'default'
                    }>
                      {parcel.status === 'LISTED' ? 'Listed' : 
                       parcel.status === 'SOLD' ? 'Sold' :
                       parcel.status === 'COLLATERALIZED' ? 'Collateralized' : 'Draft'}
                    </Badge>
                  </div>
                </div>
                
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                  {parcel.description || 'No description available'}
                </p>

                {/* AI Verification Badge - Compact + Expandable */}
                <div className="mb-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <AIVerificationBadge
                      {...verificationProps}
                      size="sm"
                    />
                    <button
                      onClick={() => setShowVerificationDetails(!showVerificationDetails)}
                      className="p-1 hover:bg-dark-700/50 rounded-lg transition-colors"
                      title="View verification details"
                    >
                      {showVerificationDetails ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  
                  {showVerificationDetails && (
                    <div className="ml-2">
                      <AIVerificationBadge
                        {...verificationProps}
                        size="md"
                        showDetails={true}
                      />
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Ruler className="h-4 w-4" />
                    <span className="text-sm">{formatArea(parcel.areaM2)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">
                      {parcel.latitude.toFixed(2)}, {parcel.longitude.toFixed(2)}
                    </span>
                  </div>
                  {parcel.priceUsd && (
                    <div className="flex items-center gap-2 text-primary-400">
                      <DollarSign className="h-5 w-5" />
                      <span className="font-semibold text-lg">
                        {formatCurrency(parcel.priceUsd)}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  <Link to={`/parcels/${parcel.id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      Details
                    </Button>
                  </Link>
                  
                  {showOwnerActions && isOwner && (
                    <>
                      {canList && (
                        <Button 
                          size="sm" 
                          onClick={() => setShowListModal(true)}
                          className="bg-primary-500/20 text-primary-400 border border-primary-500/30 hover:bg-primary-500/30"
                        >
                          <List className="h-4 w-4 mr-2" />
                          List for Sale
                        </Button>
                      )}
                      
                      {canDelist && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={handleDelist}
                          isLoading={loading}
                        >
                          <ListX className="h-4 w-4 mr-2" />
                          Delist
                        </Button>
                      )}
                      
                      {canUseAsCollateral && (
                        <Button 
                          size="sm"
                          onClick={handleUseAsCollateral}
                          className="bg-secondary-500/20 text-secondary-400 border border-secondary-500/30 hover:bg-secondary-500/30"
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Use as Collateral
                        </Button>
                      )}
                    </>
                  )}
                  
                  {canBuy && (
                    <>
                      <Link to={`/chat/parcel/${parcel.id}`}>
                        <Button variant="outline" size="sm">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Contact Seller
                        </Button>
                      </Link>
                      <Button 
                        size="sm" 
                        onClick={handleBuy}
                        isLoading={loading}
                        className="neon-glow-hover"
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Buy
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        whileHover={{ y: -5 }}
        className="group"
      >
        <Card hover className="overflow-hidden">
          <div className="aspect-video relative overflow-hidden">
            <img
              src={imageUrl}
              alt={parcel.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            
            <div className="absolute top-4 left-4">
              <Badge variant="success">
                {parcel.htsTokenId ? formatTokenId(parcel.htsTokenId) : 'DRAFT'}
              </Badge>
            </div>
            
            <div className="absolute top-4 right-4">
              <Badge variant={
                parcel.status === 'LISTED' ? 'success' : 
                parcel.status === 'SOLD' ? 'warning' :
                parcel.status === 'COLLATERALIZED' ? 'error' : 'default'
              }>
                {parcel.status}
              </Badge>
            </div>
          </div>
          
          <CardContent>
            <h3 className="font-heading text-lg font-semibold text-white mb-2 line-clamp-1">
              {parcel.title}
            </h3>
            
            <p className="text-gray-400 text-sm mb-4 line-clamp-2">
              {parcel.description || 'Aucune description disponible'}
            </p>

            {/* AI Verification Badge - Compact + Expandable */}
            <div className="mb-4 space-y-2">
              <div className="flex items-center gap-2">
                <AIVerificationBadge
                  {...verificationProps}
                  size="sm"
                />
                <button
                  onClick={() => setShowVerificationDetails(!showVerificationDetails)}
                  className="p-1 hover:bg-dark-700/50 rounded-lg transition-colors"
                  title="Voir les détails de vérification"
                >
                  {showVerificationDetails ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              
              {showVerificationDetails && (
                <div className="ml-2 p-3 bg-dark-700/30 rounded-lg border border-dark-700/50">
                  <AIVerificationBadge
                    {...verificationProps}
                    size="md"
                    showDetails={true}
                  />
                </div>
              )}
            </div>
            
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-400">
                  <Ruler className="h-4 w-4" />
                  <span className="text-sm">{formatArea(parcel.areaM2)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">
                    {parcel.latitude.toFixed(2)}, {parcel.longitude.toFixed(2)}
                  </span>
                </div>
              </div>
              
              {parcel.priceUsd && (
                <div className="flex items-center gap-2 text-primary-400">
                  <DollarSign className="h-5 w-5" />
                  <span className="font-semibold text-lg">
                    {formatCurrency(parcel.priceUsd)}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Link to={`/parcels/${parcel.id}`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  <Eye className="h-4 w-4 mr-2" />
                  Détails
                </Button>
              </Link>
              
              {showOwnerActions && isOwner && (
                <>
                  {canList && (
                    <Button 
                      size="sm" 
                      onClick={() => setShowListModal(true)}
                      className="bg-primary-500/20 text-primary-400 border border-primary-500/30 hover:bg-primary-500/30"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {canDelist && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={handleDelist}
                      isLoading={loading}
                    >
                      <ListX className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {canUseAsCollateral && (
                    <Button 
                      size="sm"
                      onClick={handleUseAsCollateral}
                      className="bg-secondary-500/20 text-secondary-400 border border-secondary-500/30 hover:bg-secondary-500/30"
                    >
                      <CreditCard className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
              
              {canBuy && (
                <>
                  <Link to={`/chat/parcel/${parcel.id}`}>
                    <Button variant="outline" size="sm">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Contact
                    </Button>
                  </Link>
                  <Button 
                    size="sm" 
                    onClick={handleBuy}
                    isLoading={loading}
                    className="neon-glow-hover flex-1"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Acheter
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* List Price Modal */}
      <Modal
        isOpen={showListModal}
        onClose={() => setShowListModal(false)}
        title="Mettre en Vente"
      >
        <div className="space-y-6">
          <div>
            <h3 className="font-medium text-white mb-2">{parcel.title}</h3>
            <p className="text-gray-400 text-sm">
              Superficie: {formatArea(parcel.areaM2)}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Prix de Vente (USD)
            </label>
            <input
              type="number"
              value={listPrice}
              onChange={(e) => setListPrice(Number(e.target.value))}
              min="1000"
              max="10000000"
              className="w-full px-4 py-3 bg-dark-700/30 rounded-xl text-white border border-dark-600/30 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-gray-400 text-xs mt-1">
              Prix par m²: {formatCurrency(listPrice / parcel.areaM2)}
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowListModal(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button 
              onClick={handleList}
              isLoading={loading}
              className="flex-1"
            >
              Mettre en Vente
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ParcelCard;