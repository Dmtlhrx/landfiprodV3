import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Shield, FileCheck, Upload, MapPin, Clock, CheckCircle, AlertTriangle, Users, Building } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button, Card, CardContent, Badge, BeninPatternBackground, Stepper } from '@hedera-africa/ui';
import Header from '@/components/Layout/Header';
import FileUpload from '@/components/FileUpload';
import { useParcels } from '@/hooks/useParcels';
import { useApi } from '@/hooks/useApi';
import { Parcel } from '@/types';
import { formatArea } from '@/utils/formatters';

const verificationSchema = z.object({
  parcelId: z.string().min(1, 'Please select a parcel'),
  verificationType: z.enum(['NOTARY', 'STATE', 'COMMUNITY'], {
    errorMap: () => ({ message: 'Please select a verification type' })
  }),
  documents: z.array(z.string()).min(1, 'At least one document required'),
  notaryInfo: z.object({
    name: z.string().optional(),
    license: z.string().optional(),
    contact: z.string().optional(),
  }).optional(),
  stateOffice: z.object({
    department: z.string().optional(),
    referenceNumber: z.string().optional(),
    officerName: z.string().optional(),
  }).optional(),
  communityWitnesses: z.array(z.object({
    name: z.string(),
    contact: z.string(),
    relationship: z.string(),
  })).optional(),
});

type VerificationForm = z.infer<typeof verificationSchema>;

interface VerificationRequest {
  id: string;
  parcelId: string;
  parcel: Parcel;
  type: 'NOTARY' | 'STATE' | 'COMMUNITY';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW';
  submittedAt: string;
  reviewedAt?: string;
  confidence?: number;
  documents: string[];
}

const VerificationPage: React.FC = () => {
  const [unverifiedParcels, setUnverifiedParcels] = useState<Parcel[]>([]);
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const { fetchMyParcels } = useParcels();
  const api = useApi();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<VerificationForm>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      parcelId: '',
      documents: [],
    }
  });

  const watchedType = watch('verificationType');

  useEffect(() => {
    loadUnverifiedParcels();
    loadVerificationRequests();
  }, []);

  // Synchroniser les fichiers uploadés avec succès avec react-hook-form
  useEffect(() => {
    const fileUrls = uploadedFiles
      .filter(f => f.status === 'success' && f.url)
      .map(f => f.url);
    setValue('documents', fileUrls, { shouldValidate: true });
  }, [uploadedFiles, setValue]);

  const loadUnverifiedParcels = async () => {
    try {
      const parcels = await fetchMyParcels();
      const unverified = parcels.filter(p => 
        p.htsTokenId && p.verificationType === 'UNVERIFIED'
      );
      setUnverifiedParcels(unverified);
    } catch (error) {
      console.error('Failed to load unverified parcels:', error);
      toast.error('Failed to load parcels');
    }
  };

  const loadVerificationRequests = async () => {
    try {
      const response = await api.get('api/verification/requests');
      if (response?.requests) {
        setVerificationRequests(response.requests);
      }
    } catch (error) {
      console.error('Failed to load verification requests:', error);
    }
  };

  const onSubmit = async (data: VerificationForm) => {
    console.log('Form submitted with data:', data);
    
    setLoading(true);
    try {
      // Ne prendre que les fichiers uploadés avec succès
      const successfulDocuments = uploadedFiles
        .filter(f => f.status === 'success' && f.url)
        .map(f => f.url);

      if (successfulDocuments.length === 0) {
        toast.error('Please wait for files to finish uploading');
        setLoading(false);
        return;
      }

      const payload = {
        ...data,
        documents: successfulDocuments,
      };

      console.log('Sending payload:', payload);

      const response = await api.post('api/verification/submit', payload);

      console.log('Response received:', response);

      if (response?.request) {
        toast.success('Verification request submitted successfully!');
        await loadVerificationRequests();
        
        // Réinitialiser le formulaire
        setSelectedParcel(null);
        setUploadedFiles([]);
        reset();
      } else {
        toast.error('Unexpected response from server');
      }
    } catch (error: any) {
      console.error('Submission error:', error);
      toast.error(error.message || 'Failed to submit verification request');
    } finally {
      setLoading(false);
    }
  };

  const onError = (errors: any) => {
    console.log('Form validation errors:', errors);
    
    if (errors.parcelId) {
      toast.error(errors.parcelId.message);
    } else if (errors.verificationType) {
      toast.error(errors.verificationType.message);
    } else if (errors.documents) {
      toast.error(errors.documents.message);
    } else {
      toast.error('Please fill in all required fields');
    }
  };

  const steps = [
    {
      id: 'select',
      title: 'Select Parcel',
      description: 'Choose an unverified parcel to verify',
      status: selectedParcel ? 'completed' : 'current',
    },
    {
      id: 'type',
      title: 'Verification Type',
      description: 'Choose verification method',
      status: watchedType ? 'completed' : selectedParcel ? 'current' : 'pending',
    },
    {
      id: 'documents',
      title: 'Upload Documents',
      description: 'Provide supporting documentation',
      status: uploadedFiles.filter(f => f.status === 'success').length > 0 ? 'completed' : watchedType ? 'current' : 'pending',
    },
    {
      id: 'submit',
      title: 'Submit Request',
      description: 'Submit for review',
      status: 'pending',
    },
  ];

  return (
    <div className="min-h-screen bg-dark-950 relative">
      <BeninPatternBackground className="fixed inset-0" />
      <Header />
      
      <div className="relative pt-8 pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-500/20 rounded-xl">
                <Shield className="h-8 w-8 text-green-400" />
              </div>
              <div>
                <h1 className="font-heading text-3xl font-bold text-white">
                  Land Verification
                </h1>
                <p className="text-gray-400">
                  Verify your land ownership to access express loans and premium features
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <Building className="h-6 w-6 text-blue-400 mb-2" />
                <h3 className="text-blue-400 font-medium">State Verification</h3>
                <p className="text-gray-400 text-sm">Official government validation</p>
              </div>
              
              <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <FileCheck className="h-6 w-6 text-purple-400 mb-2" />
                <h3 className="text-purple-400 font-medium">Notary Verification</h3>
                <p className="text-gray-400 text-sm">Certified notary validation</p>
              </div>
              
              <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <Users className="h-6 w-6 text-orange-400 mb-2" />
                <h3 className="text-orange-400 font-medium">Community Verification</h3>
                <p className="text-gray-400 text-sm">Local witness validation</p>
              </div>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Verification Form */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card>
                  <CardContent className="p-8">
                    <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-8">
                      {/* Parcel Selection */}
                      <div>
                        <h3 className="font-heading text-lg font-semibold text-white mb-4">
                          Select Parcel to Verify
                        </h3>
                        
                        {unverifiedParcels.length === 0 ? (
                          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                            <p className="text-yellow-400 font-medium mb-2">No Unverified Parcels</p>
                            <p className="text-gray-400 text-sm">
                              All your parcels are already verified or you need to tokenize land first.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {unverifiedParcels.map((parcel) => (
                              <div
                                key={parcel.id}
                                onClick={() => {
                                  setSelectedParcel(parcel);
                                  setValue('parcelId', parcel.id, { shouldValidate: true });
                                }}
                                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                                  selectedParcel?.id === parcel.id
                                    ? 'bg-green-500/20 border-green-500/50'
                                    : 'bg-dark-700/30 border-dark-600/30 hover:border-green-500/30'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-medium text-white">{parcel.title}</h4>
                                    <p className="text-gray-400 text-sm">
                                      {formatArea(parcel.areaM2)} • Token: {parcel.htsTokenId?.slice(-8)}
                                    </p>
                                  </div>
                                  <Badge variant="warning">UNVERIFIED</Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {errors.parcelId && (
                          <p className="text-red-400 text-sm mt-2">{errors.parcelId.message}</p>
                        )}
                      </div>

                      {/* Verification Type */}
                      {selectedParcel && (
                        <div>
                          <h3 className="font-heading text-lg font-semibold text-white mb-4">
                            Choose Verification Method
                          </h3>
                          
                          <div className="grid md:grid-cols-3 gap-4">
                            <label className="cursor-pointer">
                              <input
                                {...register('verificationType')}
                                type="radio"
                                value="STATE"
                                className="sr-only"
                              />
                              <div className={`p-4 rounded-lg border transition-all ${
                                watchedType === 'STATE'
                                  ? 'bg-blue-500/20 border-blue-500/50'
                                  : 'bg-dark-700/30 border-dark-600/30 hover:border-blue-500/30'
                              }`}>
                                <Building className="h-6 w-6 text-blue-400 mb-2" />
                                <h4 className="text-blue-400 font-medium">State Office</h4>
                                <p className="text-gray-400 text-sm">Government validation</p>
                              </div>
                            </label>

                            <label className="cursor-pointer">
                              <input
                                {...register('verificationType')}
                                type="radio"
                                value="NOTARY"
                                className="sr-only"
                              />
                              <div className={`p-4 rounded-lg border transition-all ${
                                watchedType === 'NOTARY'
                                  ? 'bg-purple-500/20 border-purple-500/50'
                                  : 'bg-dark-700/30 border-dark-600/30 hover:border-purple-500/30'
                              }`}>
                                <FileCheck className="h-6 w-6 text-purple-400 mb-2" />
                                <h4 className="text-purple-400 font-medium">Notary</h4>
                                <p className="text-gray-400 text-sm">Certified notary</p>
                              </div>
                            </label>

                            <label className="cursor-pointer">
                              <input
                                {...register('verificationType')}
                                type="radio"
                                value="COMMUNITY"
                                className="sr-only"
                              />
                              <div className={`p-4 rounded-lg border transition-all ${
                                watchedType === 'COMMUNITY'
                                  ? 'bg-orange-500/20 border-orange-500/50'
                                  : 'bg-dark-700/30 border-dark-600/30 hover:border-orange-500/30'
                              }`}>
                                <Users className="h-6 w-6 text-orange-400 mb-2" />
                                <h4 className="text-orange-400 font-medium">Community</h4>
                                <p className="text-gray-400 text-sm">Local witnesses</p>
                              </div>
                            </label>
                          </div>
                          {errors.verificationType && (
                            <p className="text-red-400 text-sm mt-2">{errors.verificationType.message}</p>
                          )}
                        </div>
                      )}

                      {/* Additional Info Based on Type */}
                      {watchedType === 'NOTARY' && (
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Notary Name
                            </label>
                            <input
                              {...register('notaryInfo.name')}
                              type="text"
                              className="w-full px-4 py-3 bg-dark-700/30 rounded-xl text-white border border-dark-600/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              License Number
                            </label>
                            <input
                              {...register('notaryInfo.license')}
                              type="text"
                              className="w-full px-4 py-3 bg-dark-700/30 rounded-xl text-white border border-dark-600/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                        </div>
                      )}

                      {watchedType === 'STATE' && (
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Government Department
                            </label>
                            <input
                              {...register('stateOffice.department')}
                              type="text"
                              placeholder="e.g., Ministry of Land Affairs"
                              className="w-full px-4 py-3 bg-dark-700/30 rounded-xl text-white border border-dark-600/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Reference Number
                            </label>
                            <input
                              {...register('stateOffice.referenceNumber')}
                              type="text"
                              className="w-full px-4 py-3 bg-dark-700/30 rounded-xl text-white border border-dark-600/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      )}

                      {/* Document Upload */}
                      {watchedType && selectedParcel && (
                        <div>
                          <h3 className="font-heading text-lg font-semibold text-white mb-4">
                            Upload Supporting Documents
                          </h3>
                          <FileUpload
                            parcelId={selectedParcel.id}
                            onFilesChange={setUploadedFiles}
                            maxFiles={5}
                            acceptedTypes={['image/jpeg', 'image/png', 'application/pdf']}
                            uploadImmediately={true}
                            authToken={api.authToken}
                            apiBaseUrl={api.baseUrl}
                          />
                          
                          {errors.documents && (
                            <p className="text-red-400 text-sm mt-2">{errors.documents.message}</p>
                          )}
                          
                          <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                            <h4 className="text-blue-400 font-medium mb-2">Required Documents:</h4>
                            <ul className="text-gray-300 text-sm space-y-1">
                              {watchedType === 'STATE' && (
                                <>
                                  <li>• Official land title or certificate</li>
                                  <li>• Government-issued property deed</li>
                                  <li>• Tax payment receipts</li>
                                </>
                              )}
                              {watchedType === 'NOTARY' && (
                                <>
                                  <li>• Notarized land ownership document</li>
                                  <li>• Notary's official seal and signature</li>
                                  <li>• Property survey report</li>
                                </>
                              )}
                              {watchedType === 'COMMUNITY' && (
                                <>
                                  <li>• Witness statements with signatures</li>
                                  <li>• Community leader endorsement</li>
                                  <li>• Photos of land boundaries</li>
                                </>
                              )}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Submit */}
                      {selectedParcel && watchedType && (
                        <Button
                          type="submit"
                          className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
                          size="lg"
                          isLoading={isSubmitting || loading}
                          disabled={uploadedFiles.filter(f => f.status === 'success').length === 0}
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          Submit Verification Request
                        </Button>
                      )}
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Progress & Requests */}
            <div className="space-y-6">
              {/* Progress Stepper */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card>
                  <CardContent>
                    <h3 className="font-medium text-white mb-4">Verification Progress</h3>
                    <Stepper steps={steps} />
                  </CardContent>
                </Card>
              </motion.div>

              {/* My Verification Requests */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card>
                  <CardContent>
                    <h3 className="font-medium text-white mb-4">
                      My Requests ({verificationRequests.length})
                    </h3>
                    
                    {verificationRequests.length === 0 ? (
                      <div className="text-center py-6">
                        <Clock className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">No verification requests yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {verificationRequests.map((request) => (
                          <div
                            key={request.id}
                            className="p-3 bg-dark-700/30 rounded-lg border border-dark-600/30"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-white text-sm">
                                {request.parcel.title}
                              </h4>
                              <Badge variant={
                                request.status === 'APPROVED' ? 'success' :
                                request.status === 'REJECTED' ? 'error' : 'warning'
                              }>
                                {request.status}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-400">
                                {request.type} • {new Date(request.submittedAt).toLocaleDateString()}
                              </span>
                              {request.confidence && (
                                <span className="text-green-400 font-medium">
                                  {request.confidence}% confidence
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Benefits */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card>
                  <CardContent>
                    <h3 className="font-medium text-white mb-4">Verification Benefits</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <span className="text-gray-300">Access to express loans (6% APR)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <span className="text-gray-300">Higher loan amounts (up to 70% LTV)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <span className="text-gray-300">Faster marketplace sales</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <span className="text-gray-300">Premium buyer trust</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <span className="text-gray-300">Institutional lender access</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationPage;