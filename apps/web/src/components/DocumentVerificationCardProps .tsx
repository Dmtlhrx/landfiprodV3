import React, { useState } from 'react';
import { 
  FileText, CheckCircle, XCircle, AlertTriangle, 
  Eye, Download, Trash2, ChevronDown, ChevronUp,
  Shield, Clock, FileSearch, Fingerprint
} from 'lucide-react';
import AIVerificationBadge from './AIVerificationBadgeProps ';

interface Document {
  id: string;
  filename: string;
  originalName: string;
  type: string;
  size: number;
  url: string;
  verificationStatus: 'PENDING' | 'PROCESSING' | 'VERIFIED' | 'FAILED' | 'SUSPICIOUS';
  riskLevel?: 'UNKNOWN' | 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore?: number;
  isAuthentic?: boolean;
  confidenceScore?: number;
  manipulationDetected?: boolean;
  findings?: string[];
  extractedEntities?: Array<{
    type: string;
    value: string;
    confidence: number;
  }>;
  verifiedAt?: string;
  createdAt: string;
}

interface DocumentVerificationCardProps {
  document: Document;
  onDelete?: (id: string) => void;
  onView?: (url: string) => void;
}

export const DocumentVerificationCard: React.FC<DocumentVerificationCardProps> = ({
  document,
  onDelete,
  onView,
}) => {
  const [expanded, setExpanded] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type === 'application/pdf') return '📄';
    return '📎';
  };

  return (
    <div className="bg-dark-800/50 backdrop-blur-sm border border-dark-700/50 rounded-xl overflow-hidden hover:border-primary-500/30 transition-all duration-300">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* File Icon */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-dark-700/50 rounded-lg flex items-center justify-center text-2xl">
              {getFileIcon(document.type)}
            </div>
          </div>

          {/* File Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-medium truncate">
                  {document.originalName}
                </h3>
                <p className="text-gray-400 text-sm">
                  {formatFileSize(document.size)} • {formatDate(document.createdAt)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {onView && (
                  <button
                    onClick={() => onView(document.url)}
                    className="p-2 hover:bg-dark-700/50 rounded-lg transition-colors"
                    title="Voir le document"
                  >
                    <Eye className="h-4 w-4 text-gray-400" />
                  </button>
                )}
                <a
                  href={document.url}
                  download
                  className="p-2 hover:bg-dark-700/50 rounded-lg transition-colors"
                  title="Télécharger"
                >
                  <Download className="h-4 w-4 text-gray-400" />
                </a>
                {onDelete && (
                  <button
                    onClick={() => onDelete(document.id)}
                    className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Verification Status */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <AIVerificationBadge
                status={document.verificationStatus}
                riskLevel={document.riskLevel}
                riskScore={document.riskScore}
                confidenceScore={document.confidenceScore}
                size="sm"
              />
              
              {document.manipulationDetected && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                  <AlertTriangle className="h-3 w-3" />
                  Manipulation détectée
                </span>
              )}

              {document.isAuthentic === true && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                  <CheckCircle className="h-3 w-3" />
                  Authentique
                </span>
              )}

              {document.isAuthentic === false && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  <XCircle className="h-3 w-3" />
                  Non authentique
                </span>
              )}
            </div>

            {/* Quick Stats */}
            {document.verificationStatus === 'VERIFIED' && (
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-dark-700/30 rounded-lg p-2">
                  <div className="text-xs text-gray-400 mb-1">Confiance</div>
                  <div className="text-lg font-semibold text-white">
                    {document.confidenceScore}%
                  </div>
                </div>
                <div className="bg-dark-700/30 rounded-lg p-2">
                  <div className="text-xs text-gray-400 mb-1">Risque</div>
                  <div className="text-lg font-semibold text-white">
                    {document.riskScore}%
                  </div>
                </div>
                <div className="bg-dark-700/30 rounded-lg p-2">
                  <div className="text-xs text-gray-400 mb-1">Entités</div>
                  <div className="text-lg font-semibold text-white">
                    {document.extractedEntities?.length || 0}
                  </div>
                </div>
              </div>
            )}

            {/* Expand Button */}
            {(document.findings?.length || document.extractedEntities?.length) && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300 transition-colors"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Masquer les détails
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Voir les détails de vérification
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-dark-700/50 bg-dark-900/30">
          <div className="p-4 space-y-4">
            {/* Verification Timeline */}
            {document.verifiedAt && (
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-gray-400">
                  Vérifié le {formatDate(document.verifiedAt)}
                </span>
              </div>
            )}

            {/* Findings */}
            {document.findings && document.findings.length > 0 && (
              <div>
                <h4 className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
                  <FileSearch className="h-4 w-4 text-primary-400" />
                  Résultats d'analyse
                </h4>
                <ul className="space-y-2">
                  {document.findings.map((finding, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm text-gray-300 bg-dark-800/50 rounded-lg p-3"
                    >
                      <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>{finding}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Extracted Entities */}
            {document.extractedEntities && document.extractedEntities.length > 0 && (
              <div>
                <h4 className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
                  <Fingerprint className="h-4 w-4 text-secondary-400" />
                  Données extraites ({document.extractedEntities.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {document.extractedEntities.slice(0, 10).map((entity, index) => (
                    <div
                      key={index}
                      className="bg-dark-800/50 rounded-lg p-3 border border-dark-700/30"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-400 uppercase">
                          {entity.type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-gray-500">
                          {(entity.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-sm text-white font-medium truncate">
                        {entity.value}
                      </p>
                    </div>
                  ))}
                </div>
                {document.extractedEntities.length > 10 && (
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    +{document.extractedEntities.length - 10} autres entités
                  </p>
                )}
              </div>
            )}

            {/* Security Score Visualization */}
            {document.confidenceScore !== undefined && (
              <div>
                <h4 className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
                  <Shield className="h-4 w-4 text-primary-400" />
                  Score de sécurité
                </h4>
                <div className="space-y-3">
                  {/* Confidence Bar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-400">Confiance</span>
                      <span className="text-xs font-semibold text-green-400">
                        {document.confidenceScore}%
                      </span>
                    </div>
                    <div className="h-2 bg-dark-700/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                        style={{ width: `${document.confidenceScore}%` }}
                      />
                    </div>
                  </div>

                  {/* Risk Bar */}
                  {document.riskScore !== undefined && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400">Risque</span>
                        <span className={`text-xs font-semibold ${
                          document.riskScore <= 20 ? 'text-green-400' :
                          document.riskScore <= 40 ? 'text-lime-400' :
                          document.riskScore <= 60 ? 'text-yellow-400' :
                          document.riskScore <= 80 ? 'text-orange-400' :
                          'text-red-400'
                        }`}>
                          {document.riskScore}%
                        </span>
                      </div>
                      <div className="h-2 bg-dark-700/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            document.riskScore <= 20 ? 'bg-gradient-to-r from-green-500 to-green-400' :
                            document.riskScore <= 40 ? 'bg-gradient-to-r from-lime-500 to-lime-400' :
                            document.riskScore <= 60 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
                            document.riskScore <= 80 ? 'bg-gradient-to-r from-orange-500 to-orange-400' :
                            'bg-gradient-to-r from-red-500 to-red-400'
                          }`}
                          style={{ width: `${document.riskScore}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentVerificationCard;