import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  MapPin, 
  Ruler, 
  DollarSign, 
  FileCheck, 
  ExternalLink,
  Shield,
  ShoppingCart,
  CreditCard,
  List,
  ListX,
  Edit,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp
} from 'lucide-react';
import { Button, Card, CardContent, Badge, BeninPatternBackground, Modal } from '@hedera-africa/ui';
import Header from '@/components/Layout/Header';
import ParcelMap from '@/components/ParcelMap';
import ActivityFeed from '@/components/ActivityFeed';
import AIVerificationBadge from '@/components/AIVerificationBadgeProps ';
import { useParcels } from '@/hooks/useParcels';
import { useAuthStore } from '@/store/authStore';
import { Parcel } from '@hedera-africa/ui';
import { formatCurrency, formatArea, formatTokenId } from '@/utils/formatters';

// Helper to normalize document URLs
const normalizeDocumentUrl = (url: string): string => {
  if (!url) return '';
  
  // Remove any existing protocol and domain
  let cleanUrl = url.replace(/^https?:\/\/[^/]+/, '');
  
  // Remove double slashes at the beginning
  cleanUrl = cleanUrl.replace(/^\/+/, '/');
  
  // Ensure it starts with /api/files/uploads/
  if (!cleanUrl.startsWith('/api/files/uploads/')) {
    // If it already contains the path, extract just the filename part
    const match = cleanUrl.match(/documents\/[^/]+$/);
    if (match) {
      cleanUrl = `/api/files/uploads/${match[0]}`;
    } else if (cleanUrl.startsWith('uploads/')) {
      cleanUrl = `/api/files/${cleanUrl}`;
    } else {
      cleanUrl = `/api/files/uploads/${cleanUrl}`;
    }
  }
  
  return cleanUrl;
};

// Helper to get verification props
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

const ParcelDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [loading, setLoading] = useState(true);
  const [showListModal, setShowListModal] = useState(false);
  const [showVerificationDetails, setShowVerificationDetails] = useState(false);
  const [listPrice, setListPrice] = useState(50000);
  const [actionLoading, setActionLoading] = useState(false);
  
  const { user } = useAuthStore();
  const { getParcelDetails, listParcel, delistParcel, buyParcel } = useParcels();

  useEffect(() => {
    const loadParcel = async () => {
      if (!id) return;
      
      try {
        const response = await getParcelDetails(id);
        
        if (!response || !response.parcel) {
          console.error('Invalid response from getParcelDetails:', response);
          setParcel(null);
          return;
        }
        
        setParcel(response.parcel);
        setListPrice(response.parcel.priceUsd || 50000);
      } catch (error) {
        console.error('Failed to load parcel:', error);
        setParcel(null);
      } finally {
        setLoading(false);
      }
    };
  
    loadParcel();
  }, [id, getParcelDetails, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 relative">
        <BeninPatternBackground className="fixed inset-0" />
        <Header />
        <div className="relative pt-8 pb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse space-y-6">
              <div className="h-6 bg-dark-700/30 rounded w-1/4" />
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="aspect-video bg-dark-700/30 rounded-2xl" />
                  <div className="h-64 bg-dark-700/30 rounded-xl" />
                </div>
                <div className="space-y-6">
                  <div className="h-48 bg-dark-700/30 rounded-xl" />
                  <div className="h-32 bg-dark-700/30 rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!parcel) {
    return (
      <div className="min-h-screen bg-dark-950 relative">
        <BeninPatternBackground className="fixed inset-0" />
        <Header />
        <div className="relative pt-8 pb-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Parcel not found</h1>
            <Link to="/marketplace">
              <Button>Back to Marketplace</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === parcel.ownerId;
  const canList = isOwner && parcel.htsTokenId && parcel.status === 'DRAFT';
  const canDelist = isOwner && parcel.status === 'LISTED';
  const canUseAsCollateral = isOwner && parcel.htsTokenId && parcel.status === 'LISTED';
  const canBuy = !isOwner && parcel.status === 'LISTED' && parcel.priceUsd;

  const verificationProps = getVerificationPropsFromParcel(parcel);
  const verificationDetails = parcel.verificationDetails || {};

  const handleList = async () => {
    setActionLoading(true);
    try {
      await listParcel(parcel.id, listPrice);
      setParcel({ ...parcel, status: 'LISTED', priceUsd: listPrice });
      setShowListModal(false);
    } catch (error) {
      console.error('Failed to list parcel:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelist = async () => {
    setActionLoading(true);
    try {
      await delistParcel(parcel.id);
      setParcel({ ...parcel, status: 'DRAFT' });
    } catch (error) {
      console.error('Failed to delist parcel:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBuy = async () => {
    setActionLoading(true);
    try {
      await buyParcel(parcel.id);
      setParcel({ ...parcel, status: 'SOLD', ownerId: user!.id });
    } catch (error) {
      console.error('Failed to buy parcel:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUseAsCollateral = () => {
    navigate(`/loans?parcelId=${parcel.id}`);
  };

  const imageUrl = `https://images.pexels.com/photos/1595108/pexels-photo-1595108.jpeg?auto=compress&cs=tinysrgb&w=1200`;

  return (
    <div className="min-h-screen bg-dark-950 relative">
      <BeninPatternBackground className="fixed inset-0" />
      <Header />
      <div className="relative pt-8 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Navigation */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6"
          >
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-primary-400 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Marketplace
            </Link>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header Image */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="aspect-video rounded-2xl overflow-hidden">
                  <img
                    src={imageUrl}
                    alt={parcel.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </motion.div>

              {/* Details */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card>
                  <CardContent>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h1 className="font-heading text-2xl font-bold text-white mb-2">
                          {parcel.title}
                        </h1>
                        <p className="text-gray-400">
                          Owner: {parcel.owner.displayName}
                        </p>
                      </div>
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

                    <p className="text-gray-300 mb-6 leading-relaxed">
                      {parcel.description}
                    </p>

                    {/* Specifications */}
                    <div className="grid md:grid-cols-3 gap-6 mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-500/20 rounded-lg">
                          <Ruler className="h-5 w-5 text-primary-400" />
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Area</p>
                          <p className="text-white font-semibold">
                            {formatArea(parcel.areaM2)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-secondary-500/20 rounded-lg">
                          <MapPin className="h-5 w-5 text-secondary-400" />
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Coordinates</p>
                          <p className="text-white font-semibold font-mono text-sm">
                            {parcel.latitude.toFixed(4)}, {parcel.longitude.toFixed(4)}
                          </p>
                        </div>
                      </div>

                      {parcel.htsTokenId && (
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-accent-500/20 rounded-lg">
                            <Shield className="h-5 w-5 text-accent-400" />
                          </div>
                          <div>
                            <p className="text-gray-400 text-sm">HTS Token</p>
                            <p className="text-white font-semibold font-mono text-sm">
                              {parcel.htsTokenId}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* AI Verification Section */}
                    <div className="mb-6 border-t border-dark-700/50 pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-white flex items-center gap-2">
                          <Shield className="h-5 w-5 text-primary-400" />
                          Verification Details
                        </h3>
                        <button
                          onClick={() => setShowVerificationDetails(!showVerificationDetails)}
                          className="p-1 hover:bg-dark-700/50 rounded-lg transition-colors"
                        >
                          {showVerificationDetails ? (
                            <ChevronUp className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>

                      <div className="mb-4">
                        <AIVerificationBadge
                          {...verificationProps}
                          size="sm"
                        />
                      </div>

                      {showVerificationDetails && (
                        <div className="space-y-4 p-4 bg-dark-700/30 rounded-lg border border-dark-700/50">
                          <div>
                            <AIVerificationBadge
                              {...verificationProps}
                              size="md"
                              showDetails={true}
                            />
                          </div>

                          {/* Verification Type & Status */}
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-gray-400 text-sm mb-2">Verification Type</p>
                              <p className="text-white font-semibold capitalize">
                                {verificationDetails.type || 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-sm mb-2">Verification Status</p>
                              <p className="text-white font-semibold capitalize">
                                {verificationDetails.status || 'N/A'}
                              </p>
                            </div>
                          </div>

                          {/* Votes */}
                          {verificationDetails.votes && (
                            <div className="grid md:grid-cols-2 gap-4">
                              <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                                <div className="flex items-center gap-2 mb-1">
                                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                                  <span className="text-sm text-gray-400">Approvals</span>
                                </div>
                                <p className="text-2xl font-bold text-green-400">
                                  {verificationDetails.votes.approve || 0}
                                </p>
                              </div>
                              <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                                <div className="flex items-center gap-2 mb-1">
                                  <AlertCircle className="h-4 w-4 text-red-400" />
                                  <span className="text-sm text-gray-400">Rejections</span>
                                </div>
                                <p className="text-2xl font-bold text-red-400">
                                  {verificationDetails.votes.reject || 0}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Submitted & Verified Dates */}
                          <div className="grid md:grid-cols-2 gap-4">
                            {verificationDetails.submittedAt && (
                              <div className="flex items-start gap-3">
                                <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                                <div>
                                  <p className="text-gray-400 text-sm">Submitted</p>
                                  <p className="text-white font-semibold">
                                    {new Date(verificationDetails.submittedAt).toLocaleDateString('en', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Verification Documents */}
                          {verificationDetails.documents && verificationDetails.documents.length > 0 && (
                            <div>
                              <p className="text-gray-400 text-sm mb-3">Verification Documents</p>
                              <div className="flex flex-wrap gap-2">
                                {verificationDetails.documents.map((doc, index) => {
                                  const normalizedUrl = normalizeDocumentUrl(doc);
                                  return (
                                    <a
                                      key={index}
                                      href={normalizedUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 transition-colors p-2 bg-primary-500/10 rounded-lg border border-primary-500/30"
                                    >
                                      <FileCheck className="h-4 w-4" />
                                      Document {index + 1}
                                      <ExternalLink className="h-4 w-4" />
                                    </a>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Additional Info */}
                          {verificationDetails.additionalInfo && Object.keys(verificationDetails.additionalInfo).length > 0 && (
                            <div>
                              <p className="text-gray-400 text-sm mb-3">Additional Information</p>
                              <div className="space-y-2">
                                {Object.entries(verificationDetails.additionalInfo).map(([key, value]) => (
                                  <div key={key} className="flex justify-between text-sm">
                                    <span className="text-gray-400 capitalize">{key}:</span>
                                    <span className="text-white">{String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Documents Section */}
                    {parcel.docUrl && (
                      <div className="mb-6 border-t border-dark-700/50 pt-6">
                        <h3 className="font-medium text-white mb-3">Documents</h3>
                        <div className="flex flex-wrap gap-2">
                          {parcel.docUrl.split(',').map((url, index) => {
                            const normalizedUrl = normalizeDocumentUrl(url.trim());
                            
                            return (
                              <a
                                key={index}
                                href={normalizedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 transition-colors p-2 bg-primary-500/10 rounded-lg border border-primary-500/30"
                              >
                                <FileCheck className="h-4 w-4" />
                                Document {index + 1}
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Owner Actions */}
                    {isOwner && (
                      <div className="flex gap-3 flex-wrap pt-6 border-t border-dark-700/50">
                        {canList && (
                          <Button 
                            onClick={() => setShowListModal(true)}
                            className="bg-primary-500/20 text-primary-400 border border-primary-500/30 hover:bg-primary-500/30"
                          >
                            <List className="h-4 w-4 mr-2" />
                            List for Sale
                          </Button>
                        )}
                        
                        {canDelist && (
                          <Button 
                            variant="outline"
                            onClick={handleDelist}
                            isLoading={actionLoading}
                          >
                            <ListX className="h-4 w-4 mr-2" />
                            Remove from Sale
                          </Button>
                        )}
                        
                        {canUseAsCollateral && (
                          <Button 
                            onClick={handleUseAsCollateral}
                            className="bg-secondary-500/20 text-secondary-400 border border-secondary-500/30 hover:bg-secondary-500/30"
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Use as Collateral
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Map */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <ParcelMap
                  latitude={parcel.latitude}
                  longitude={parcel.longitude}
                  title={parcel.title}
                  interactive={true}
                />
              </motion.div>

              {/* Activity Timeline */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <ActivityFeed activities={parcel.activities} />
              </motion.div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Price & Actions */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card>
                  <CardContent>
                    {parcel.priceUsd ? (
                      <div className="text-center mb-6">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <DollarSign className="h-6 w-6 text-primary-400" />
                          <span className="font-heading text-3xl font-bold text-white">
                            {formatCurrency(parcel.priceUsd)}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm">
                          {formatCurrency(parcel.priceUsd / parcel.areaM2)} per m²
                        </p>
                      </div>
                    ) : (
                      <div className="text-center mb-6">
                        <p className="text-gray-400">Price not set</p>
                      </div>
                    )}

                    <div className="space-y-3">
                      {canBuy && (
                        <Button 
                          className="w-full neon-glow-hover" 
                          size="lg"
                          onClick={handleBuy}
                          isLoading={actionLoading}
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Buy Now
                        </Button>
                      )}
                      
                      {canUseAsCollateral && (
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={handleUseAsCollateral}
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Use as Collateral
                        </Button>
                      )}
                      
                      {isOwner && (
                        <>
                          {canList && (
                            <Button 
                              variant="outline" 
                              className="w-full"
                              onClick={() => setShowListModal(true)}
                            >
                              <List className="h-4 w-4 mr-2" />
                              List for Sale
                            </Button>
                          )}
                          
                          {canDelist && (
                            <Button 
                              variant="outline" 
                              className="w-full"
                              onClick={handleDelist}
                              isLoading={actionLoading}
                            >
                              <ListX className="h-4 w-4 mr-2" />
                              Remove from Sale
                            </Button>
                          )}
                        </>
                      )}
                      
                      <Button variant="ghost" className="w-full">
                        Add to Favorites
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Quick Stats */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card>
                  <CardContent>
                    <h3 className="font-medium text-white mb-4">Statistics</h3>
                    <div className="space-y-3">
                      {parcel.priceUsd && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Price per m²</span>
                          <span className="text-white font-semibold">
                            {formatCurrency(parcel.priceUsd / parcel.areaM2)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-400">Created on</span>
                        <span className="text-white font-semibold">
                          {new Date(parcel.createdAt).toLocaleDateString('en')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Activities</span>
                        <span className="text-white font-semibold">
                          {parcel.activities.length}
                        </span>
                      </div>
                      {parcel.htsTokenId && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Explorer</span>
                          <a
                            href={`https://hashscan.io/testnet/token/${parcel.htsTokenId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-400 hover:text-primary-300 transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Verification Summary Card */}
              {verificationDetails && (
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <Card>
                    <CardContent>
                      <h3 className="font-medium text-white mb-4 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary-400" />
                        Verification Summary
                      </h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-primary-500/10 rounded-lg border border-primary-500/20">
                          <span className="text-gray-400">Confidence</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-dark-700/50 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-green-500 to-green-400"
                                style={{ width: `${verificationProps.confidenceScore}%` }}
                              />
                            </div>
                            <span className="text-white font-semibold w-12 text-right">
                              {verificationProps.confidenceScore}%
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                          <span className="text-gray-400">Risk Score</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-dark-700/50 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  verificationProps.riskScore <= 20 ? 'bg-gradient-to-r from-green-500 to-green-400' :
                                  verificationProps.riskScore <= 40 ? 'bg-gradient-to-r from-lime-500 to-lime-400' :
                                  verificationProps.riskScore <= 60 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
                                  verificationProps.riskScore <= 80 ? 'bg-gradient-to-r from-orange-500 to-orange-400' :
                                  'bg-gradient-to-r from-red-500 to-red-400'
                                }`}
                                style={{ width: `${verificationProps.riskScore}%` }}
                              />
                            </div>
                            <span className="text-white font-semibold w-12 text-right">
                              {verificationProps.riskScore}%
                            </span>
                          </div>
                        </div>

                        {verificationDetails.votes && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Community Approvals</span>
                              <span className="text-green-400 font-semibold">
                                {verificationDetails.votes.approve || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Community Rejections</span>
                              <span className="text-red-400 font-semibold">
                                {verificationDetails.votes.reject || 0}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* List Price Modal */}
      <Modal
        isOpen={showListModal}
        onClose={() => setShowListModal(false)}
        title="List for Sale"
      >
        <div className="space-y-6">
          <div>
            <h3 className="font-medium text-white mb-2">{parcel.title}</h3>
            <p className="text-gray-400 text-sm">
              Area: {formatArea(parcel.areaM2)}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Sale Price (USD)
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
              Price per m²: {formatCurrency(listPrice / parcel.areaM2)}
            </p>
          </div>
          
          <div className="p-4 bg-primary-500/10 border border-primary-500/30 rounded-lg">
            <p className="text-primary-400 font-medium mb-1">Sales commission</p>
            <p className="text-gray-400 text-sm">
              2.5% of the sale price will be deducted upon transaction
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowListModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleList}
              isLoading={actionLoading}
              className="flex-1"
            >
              List for Sale
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ParcelDetailPage;