import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, ThumbsUp, ThumbsDown, FileCheck, MapPin, Clock, AlertTriangle, CheckCircle, Shield, Eye, MessageSquare } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button, Card, CardContent, Badge, BeninPatternBackground } from '@hedera-africa/ui';
import Header from '@/components/Layout/Header';
import { useApi } from '@/hooks/useApi';
import { Parcel } from '@/types';
import { formatArea } from '@/utils/formatters';

interface VerificationRequest {
  id: string;
  parcelId: string;
  parcel: Parcel;
  owner: {
    id: string;
    name: string;
    email: string;
    reputationScore: number;
  };
  type: 'NOTARY' | 'STATE' | 'COMMUNITY';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  documents: string[];
  confidence: number;
  votes: {
    approve: number;
    reject: number;
  };
}

const CommunityVotingPage: React.FC = () => {
  const [pendingRequests, setPendingRequests] = useState<VerificationRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [votingLoading, setVotingLoading] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'STATE' | 'NOTARY' | 'COMMUNITY'>('ALL');

  const api = useApi();

  useEffect(() => {
    loadPendingVerifications();
  }, []);

  const loadPendingVerifications = async () => {
    setLoading(true);
    try {
      const response = await api.get('api/verification/pending');
      if (response?.requests) {
        setPendingRequests(response.requests);
      }
    } catch (error) {
      console.error('Failed to load pending verifications:', error);
      toast.error('Failed to load verification requests');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (verificationId: string, vote: 'APPROVE' | 'REJECT') => {
    setVotingLoading(verificationId);
    try {
      const response = await api.post('api/verification/vote', {
        verificationId,
        vote,
        comment: comment.trim() || undefined,
      });

      if (response?.success) {
        toast.success(`Vote ${vote === 'APPROVE' ? 'approved' : 'rejected'} successfully!`);
        await loadPendingVerifications();
        setSelectedRequest(null);
        setComment('');
      }
    } catch (error: any) {
      console.error('Vote error:', error);
      toast.error(error.message || 'Failed to submit vote');
    } finally {
      setVotingLoading(null);
    }
  };

  const getVerificationTypeColor = (type: string) => {
    switch (type) {
      case 'STATE':
        return { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' };
      case 'NOTARY':
        return { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400' };
      case 'COMMUNITY':
        return { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' };
      default:
        return { bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-400' };
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-400';
    if (confidence >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const filteredRequests = filter === 'ALL' 
    ? pendingRequests 
    : pendingRequests.filter(req => req.type === filter);

  const totalVotes = selectedRequest 
    ? selectedRequest.votes.approve + selectedRequest.votes.reject 
    : 0;
  const approvalRate = totalVotes > 0 
    ? Math.round((selectedRequest!.votes.approve / totalVotes) * 100) 
    : 0;

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
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-orange-500/20 rounded-xl">
                <Users className="h-8 w-8 text-orange-400" />
              </div>
              <div>
                <h1 className="font-heading text-3xl font-bold text-white">
                  Community Verification Voting
                </h1>
                <p className="text-gray-400">
                  Help verify land ownership by voting on pending requests
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Pending Requests</p>
                    <p className="text-2xl font-bold text-green-400">{pendingRequests.length}</p>
                  </div>
                  <Clock className="h-8 w-8 text-green-400" />
                </div>
              </div>
              
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Your Impact</p>
                    <p className="text-2xl font-bold text-blue-400">+5 Rep</p>
                  </div>
                  <Shield className="h-8 w-8 text-blue-400" />
                </div>
              </div>
              
              <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Community Power</p>
                    <p className="text-2xl font-bold text-purple-400">Active</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-purple-400" />
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Verification Requests List */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-heading text-lg font-semibold text-white">
                        Pending Verifications ({filteredRequests.length})
                      </h3>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => setFilter('ALL')}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                            filter === 'ALL'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-dark-700/30 text-gray-400 hover:bg-dark-700/50'
                          }`}
                        >
                          All
                        </button>
                        <button
                          onClick={() => setFilter('STATE')}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                            filter === 'STATE'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-dark-700/30 text-gray-400 hover:bg-dark-700/50'
                          }`}
                        >
                          State
                        </button>
                        <button
                          onClick={() => setFilter('NOTARY')}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                            filter === 'NOTARY'
                              ? 'bg-purple-500/20 text-purple-400'
                              : 'bg-dark-700/30 text-gray-400 hover:bg-dark-700/50'
                          }`}
                        >
                          Notary
                        </button>
                        <button
                          onClick={() => setFilter('COMMUNITY')}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                            filter === 'COMMUNITY'
                              ? 'bg-orange-500/20 text-orange-400'
                              : 'bg-dark-700/30 text-gray-400 hover:bg-dark-700/50'
                          }`}
                        >
                          Community
                        </button>
                      </div>
                    </div>

                    {loading ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
                        <p className="text-gray-400 mt-4">Loading verifications...</p>
                      </div>
                    ) : filteredRequests.length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400">No pending verification requests</p>
                        <p className="text-gray-500 text-sm mt-2">Check back later for new requests</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {filteredRequests.map((request) => {
                          const colors = getVerificationTypeColor(request.type);
                          const totalVotes = request.votes.approve + request.votes.reject;
                          
                          return (
                            <div
                              key={request.id}
                              onClick={() => setSelectedRequest(request)}
                              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                                selectedRequest?.id === request.id
                                  ? 'bg-green-500/20 border-green-500/50 ring-2 ring-green-500/30'
                                  : 'bg-dark-700/30 border-dark-600/30 hover:border-green-500/30 hover:bg-dark-700/50'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-medium text-white">{request.parcel.title}</h4>
                                    <Badge variant="warning">PENDING</Badge>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-gray-400">
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {formatArea(request.parcel.areaM2)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {new Date(request.submittedAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className={`px-3 py-1 ${colors.bg} border ${colors.border} rounded-lg`}>
                                  <span className={`text-sm font-medium ${colors.text}`}>
                                    {request.type}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-3 border-t border-dark-600/30">
                                <div className="flex items-center gap-4 text-sm">
                                  <div className="flex items-center gap-1">
                                    <ThumbsUp className="h-3 w-3 text-green-400" />
                                    <span className="text-green-400 font-medium">{request.votes.approve}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <ThumbsDown className="h-3 w-3 text-red-400" />
                                    <span className="text-red-400 font-medium">{request.votes.reject}</span>
                                  </div>
                                  <div className={`font-medium ${getConfidenceColor(request.confidence)}`}>
                                    {request.confidence}% confidence
                                  </div>
                                </div>
                                
                                <button className="text-green-400 hover:text-green-300 text-sm font-medium flex items-center gap-1">
                                  <Eye className="h-3 w-3" />
                                  Review
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Voting Panel */}
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                {selectedRequest ? (
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-heading text-lg font-semibold text-white mb-4">
                        Verification Details
                      </h3>

                      <div className="space-y-4">
                        {/* Owner Info */}
                        <div className="p-3 bg-dark-700/30 rounded-lg">
                          <p className="text-gray-400 text-sm mb-1">Owner</p>
                          <p className="text-white font-medium">{selectedRequest.owner.name}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="info">
                              Rep: {selectedRequest.owner.reputationScore}
                            </Badge>
                          </div>
                        </div>

                        {/* Confidence Score */}
                        <div className="p-3 bg-dark-700/30 rounded-lg">
                          <p className="text-gray-400 text-sm mb-2">AI Confidence Score</p>
                          <div className="flex items-center justify-between">
                            <div className="flex-1 bg-dark-600/30 rounded-full h-2 mr-3">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  selectedRequest.confidence >= 80
                                    ? 'bg-green-400'
                                    : selectedRequest.confidence >= 60
                                    ? 'bg-yellow-400'
                                    : 'bg-red-400'
                                }`}
                                style={{ width: `${selectedRequest.confidence}%` }}
                              />
                            </div>
                            <span className={`font-bold ${getConfidenceColor(selectedRequest.confidence)}`}>
                              {selectedRequest.confidence}%
                            </span>
                          </div>
                        </div>

                        {/* Current Votes */}
                        <div className="p-3 bg-dark-700/30 rounded-lg">
                          <p className="text-gray-400 text-sm mb-3">Community Votes</p>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <ThumbsUp className="h-4 w-4 text-green-400" />
                                <span className="text-gray-300">Approve</span>
                              </div>
                              <span className="text-green-400 font-bold">{selectedRequest.votes.approve}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <ThumbsDown className="h-4 w-4 text-red-400" />
                                <span className="text-gray-300">Reject</span>
                              </div>
                              <span className="text-red-400 font-bold">{selectedRequest.votes.reject}</span>
                            </div>
                            {totalVotes > 0 && (
                              <div className="pt-2 border-t border-dark-600/30">
                                <p className="text-gray-400 text-sm">
                                  Approval Rate: <span className="text-white font-medium">{approvalRate}%</span>
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Documents */}
                        <div className="p-3 bg-dark-700/30 rounded-lg">
                          <p className="text-gray-400 text-sm mb-2">Supporting Documents</p>
                          <div className="flex items-center gap-2">
                            <FileCheck className="h-4 w-4 text-blue-400" />
                            <span className="text-white font-medium">
                              {selectedRequest.documents.length} documents
                            </span>
                          </div>
                        </div>

                        {/* Comment Box */}
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            <MessageSquare className="h-3 w-3 inline mr-1" />
                            Add Comment (Optional)
                          </label>
                          <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Share your reasoning..."
                            rows={3}
                            className="w-full px-3 py-2 bg-dark-700/30 rounded-lg text-white border border-dark-600/30 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                          />
                        </div>

                        {/* Vote Buttons */}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <Button
                            onClick={() => handleVote(selectedRequest.id, 'APPROVE')}
                            className="bg-green-500 hover:bg-green-600 text-white"
                            isLoading={votingLoading === selectedRequest.id}
                            disabled={!!votingLoading}
                          >
                            <ThumbsUp className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          
                          <Button
                            onClick={() => handleVote(selectedRequest.id, 'REJECT')}
                            className="bg-red-500 hover:bg-red-600 text-white"
                            isLoading={votingLoading === selectedRequest.id}
                            disabled={!!votingLoading}
                          >
                            <ThumbsDown className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>

                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                          <div className="flex gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-yellow-400 font-medium text-sm">Voting Responsibility</p>
                              <p className="text-gray-300 text-xs mt-1">
                                Your vote helps maintain the integrity of the land registry. Vote honestly based on the evidence provided.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                        <h3 className="text-white font-medium mb-2">Select a Request</h3>
                        <p className="text-gray-400 text-sm">
                          Choose a verification request from the list to review and vote
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </motion.div>

              {/* Voting Guidelines */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-medium text-white mb-4">Voting Guidelines</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-300">Review all supporting documents carefully</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-300">Consider the AI confidence score</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-300">Check owner's reputation history</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-300">Vote honestly to earn reputation</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-300">Add comments to explain your decision</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Rewards Info */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-medium text-white mb-4">Voting Rewards</h3>
                    <div className="space-y-3">
                      <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-green-400 font-medium">Per Vote</span>
                          <span className="text-green-400 font-bold">+5 Rep</span>
                        </div>
                        <p className="text-gray-400 text-xs">Earn reputation for each vote cast</p>
                      </div>
                      
                      <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-blue-400 font-medium">Consensus Bonus</span>
                          <span className="text-blue-400 font-bold">+10 Rep</span>
                        </div>
                        <p className="text-gray-400 text-xs">Extra points when you vote with majority</p>
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

export default CommunityVotingPage;