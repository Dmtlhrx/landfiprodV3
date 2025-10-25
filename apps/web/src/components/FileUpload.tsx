import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, File, X, CheckCircle, AlertCircle, Image, FileText, Shield, AlertTriangle, Sparkles } from 'lucide-react';

interface AIVerificationResult {
  isAuthentic: boolean | null;
  confidenceScore: number;
  manipulationDetected: boolean;
  findings: string[];
  extractedData: Record<string, any>;
  risks: string[];
  timestamp?: string;
  error?: string;
}

interface UploadedFile {
  id: string;
  name: string;
  originalName: string;
  size: number;
  type: string;
  status: 'ready' | 'uploading' | 'verifying' | 'success' | 'error';
  progress?: number;
  url?: string;
  file?: File;
  error?: string;
  aiVerification?: AIVerificationResult | null;
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'ghost' | 'primary';
  size?: 'sm' | 'md';
}

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'error' | 'warning' | 'info';
  size?: 'sm' | 'md';
}

interface FileUploadProps {
  parcelId?: string;
  onFilesChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
  className?: string;
  authToken?: string;
  apiBaseUrl?: string;
  uploadImmediately?: boolean;
  enableAIVerification?: boolean;
  aiVerificationEndpoint?: string;
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', onClick, className = '', disabled, ...props }) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className={`px-3 py-2 rounded-lg transition-colors ${
      variant === 'ghost' ? 'hover:bg-gray-800' : 'bg-emerald-600 hover:bg-emerald-700'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    {...props}
  >
    {children}
  </button>
);

const Badge: React.FC<BadgeProps> = ({ children, variant = 'info', size = 'sm' }) => (
  <span className={`px-2 py-1 rounded text-xs font-medium ${
    variant === 'success' ? 'bg-emerald-900 text-emerald-200' :
    variant === 'error' ? 'bg-red-900 text-red-200' :
    variant === 'warning' ? 'bg-yellow-900 text-yellow-200' :
    'bg-emerald-900 text-emerald-200'
  }`}>
    {children}
  </span>
);

const ScanningAnimation: React.FC<{ isScanning: boolean }> = ({ isScanning }) => {
  if (!isScanning) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-gradient-to-br from-gray-900/80 via-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-40"
    >
      <div className="relative w-32 h-32">
        <div className="absolute inset-0 grid grid-cols-3 gap-1">
          {Array.from({ length: 9 }).map((_, i) => (
            <motion.div
              key={i}
              className="border border-emerald-500/50 rounded"
              animate={{
                borderColor: ['rgba(16, 185, 129, 0.3)', 'rgba(16, 185, 129, 0.8)', 'rgba(16, 185, 129, 0.3)'],
                boxShadow: ['0 0 0px rgba(16, 185, 129, 0)', '0 0 8px rgba(16, 185, 129, 0.5)', '0 0 0px rgba(16, 185, 129, 0)']
              }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.05 }}
            />
          ))}
        </div>

        <motion.div
          className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/30 to-transparent"
          animate={{ y: [-128, 128] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          style={{ height: '40px' }}
        />

        <motion.div
          className="absolute inset-2 border-2 border-emerald-400 rounded-lg"
          animate={{
            boxShadow: ['0 0 10px rgba(16, 185, 129, 0.3)', '0 0 25px rgba(16, 185, 129, 0.6)', '0 0 10px rgba(16, 185, 129, 0.3)']
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-4 text-center"
      >
        <p className="text-emerald-400 text-xs font-medium">Scanning...</p>
      </motion.div>
    </motion.div>
  );
};

const FileUpload: React.FC<FileUploadProps> = ({
  parcelId,
  onFilesChange,
  maxFiles = 5,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  className = '',
  authToken,
  apiBaseUrl = 'http://localhost:3001/api',
  uploadImmediately = false,
  enableAIVerification = true,
  aiVerificationEndpoint = '/ai/verify-document',
}) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const filesRef = useRef<UploadedFile[]>([]);

  useEffect(() => {
    onFilesChange(files);
    filesRef.current = files;
  }, [files, onFilesChange]);

  const verifyDocumentWithAI = useCallback(async (file: File, uploadedFileData: any): Promise<AIVerificationResult | null> => {
    if (!enableAIVerification || !authToken) {
      return null;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentId', uploadedFileData.id);
      
      const baseUrl = apiBaseUrl.endsWith('/api') ? apiBaseUrl : `${apiBaseUrl}/api`;
      const verifyUrl = `${baseUrl}${aiVerificationEndpoint}`;
      
      console.log('🤖 AI Verification starting:', verifyUrl);

      const response = await fetch(verifyUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`AI verification failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ AI Verification result:', result);
      
      const data = result.data || result;
      return {
        isAuthentic: data.isAuthentic,
        confidenceScore: data.confidenceScore,
        manipulationDetected: data.manipulationDetected,
        findings: data.findings || [],
        extractedData: data.extractedData || {},
        risks: data.risks || [],
        timestamp: data.timestamp,
      };
    } catch (error) {
      console.error('❌ AI Verification error:', error);
      return {
        isAuthentic: null,
        confidenceScore: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        manipulationDetected: false,
        findings: [],
        extractedData: {},
        risks: [],
      };
    }
  }, [enableAIVerification, authToken, apiBaseUrl, aiVerificationEndpoint]);

  const uploadFile = useCallback(async (file: File, targetParcelId: string) => {
    if (!authToken) {
      throw new Error('Auth token required for upload');
    }

    const formData = new FormData();
    formData.append('file', file);

    const baseUrl = apiBaseUrl.endsWith('/api') ? apiBaseUrl : `${apiBaseUrl}/api`;
    const uploadUrl = `${baseUrl}/parcels/${targetParcelId}/documents`;
    
    console.log('📤 Uploading to:', uploadUrl);

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Upload failed');
    }

    return {
      id: result.data.id,
      name: result.data.filename,
      originalName: result.data.originalName,
      size: result.data.size,
      type: result.data.type,
      url: result.data.url,
    };
  }, [authToken, apiBaseUrl]);

  const processFileUpload = useCallback(async (fileId: string, file: File, targetParcelId: string) => {
    try {
      console.log(`[${fileId}] Phase 1: Starting upload...`);
      
      const progressInterval = setInterval(() => {
        setFiles(prev => prev.map(f => 
          f.id === fileId && f.status === 'uploading'
            ? { ...f, progress: Math.min((f.progress || 0) + Math.random() * 15, 85) }
            : f
        ));
      }, 200);

      const uploadedFile = await uploadFile(file, targetParcelId);
      clearInterval(progressInterval);
      console.log(`[${fileId}] Phase 1: Upload complete`);

      console.log(`[${fileId}] Phase 2: Setting status to 'verifying'`);
      setFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, name: uploadedFile.name, progress: 90, status: 'verifying' }
          : f
      ));

      console.log(`[${fileId}] Phase 3: Starting AI verification...`);
      const aiResult = await verifyDocumentWithAI(file, uploadedFile);
      console.log(`[${fileId}] Phase 3: AI verification complete`, aiResult);
      
      console.log(`[${fileId}] Phase 4: Setting status to 'success'`);
      setFiles(prev => prev.map(f => {
        if (f.id === fileId) {
          const updated: UploadedFile = {
            id: fileId,
            name: uploadedFile.name,
            originalName: f.originalName,
            size: f.size,
            type: f.type,
            status: 'success',
            progress: 100,
            url: uploadedFile.url,
            file,
            aiVerification: aiResult
          };
          console.log(`[${fileId}] Updated file:`, updated);
          return updated;
        }
        return f;
      }));

    } catch (error) {
      console.error(`[${fileId}] Error:`, error);
      setFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { 
              ...f, 
              status: 'error', 
              error: error instanceof Error ? error.message : 'Unknown error',
              progress: undefined
            }
          : f
      ));
    }
  }, [uploadFile, verifyDocumentWithAI]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const canUploadNow = uploadImmediately && parcelId && authToken;

    console.log('📁 Files dropped:', { count: acceptedFiles.length, canUploadNow });

    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      originalName: file.name,
      size: file.size,
      type: file.type,
      status: canUploadNow ? 'uploading' : 'ready',
      progress: canUploadNow ? 0 : undefined,
      file,
      aiVerification: null,
    }));

    setFiles(prev => [...prev, ...newFiles]);

    if (canUploadNow) {
      for (const newFile of newFiles) {
        processFileUpload(newFile.id, newFile.file!, parcelId);
      }
    }
  }, [parcelId, authToken, uploadImmediately, processFileUpload]);

  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const retryUpload = useCallback(async (fileId: string) => {
    const fileToRetry = filesRef.current.find(f => f.id === fileId);
    if (!fileToRetry || !fileToRetry.file || !parcelId || !authToken) return;

    setFiles(prev => prev.map(f => 
      f.id === fileId 
        ? { ...f, status: 'uploading', error: undefined, progress: 0, aiVerification: null }
        : f
    ));

    processFileUpload(fileId, fileToRetry.file, parcelId);
  }, [parcelId, authToken, processFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxFiles: maxFiles - files.filter(f => f.status === 'success').length,
    disabled: files.filter(f => f.status === 'success').length >= maxFiles,
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4 text-emerald-400" />;
    if (type === 'application/pdf') return <FileText className="h-4 w-4 text-red-400" />;
    return <File className="h-4 w-4 text-gray-400" />;
  };

  const getStatusBadge = (file: UploadedFile) => {
    switch (file.status) {
      case 'ready':
        return <Badge variant="warning" size="sm">Pending</Badge>;
      case 'uploading':
        return <Badge variant="warning" size="sm">Uploading...</Badge>;
      case 'verifying':
        return <Badge variant="info" size="sm">Verifying...</Badge>;
      case 'success':
        return <Badge variant="success" size="sm">Uploaded</Badge>;
      case 'error':
        return <Badge variant="error" size="sm">Error</Badge>;
      default:
        return null;
    }
  };

  const getAIVerificationBadge = (aiVerification: AIVerificationResult | null | undefined) => {
    if (!aiVerification) return null;
    
    if (aiVerification.error) {
      return (
        <div className="flex items-center gap-2 text-gray-400 text-xs">
          <AlertCircle className="h-3 w-3" />
          <span>Verification unavailable</span>
        </div>
      );
    }

    const score = aiVerification.confidenceScore;
    const isAuthentic = aiVerification.isAuthentic;
    const hasManipulation = aiVerification.manipulationDetected;

    if (hasManipulation || !isAuthentic) {
      return (
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <div className="flex flex-col">
            <span className="text-red-400 text-xs font-semibold">⚠️ Suspicious Document</span>
            <span className="text-red-300 text-xs">Manipulation detected ({score}%)</span>
          </div>
        </div>
      );
    }

    if (score >= 85) {
      return (
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-400" />
          <div className="flex flex-col">
            <span className="text-emerald-400 text-xs font-semibold">✓ Authentic Document</span>
            <span className="text-emerald-300 text-xs">Confidence: {score}%</span>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-yellow-400" />
        <div className="flex flex-col">
          <span className="text-yellow-400 text-xs font-semibold">⚠ Manual verification required</span>
          <span className="text-yellow-300 text-xs">Confidence: {score}%</span>
        </div>
      </div>
    );
  };

  const successfulFiles = files.filter(f => f.status === 'success').length;
  const readyFiles = files.filter(f => f.status === 'ready').length;

  return (
    <div className={className}>
      {successfulFiles < maxFiles && (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
            transition-all duration-300 bg-gray-900/50
            ${isDragActive
              ? 'border-emerald-500 bg-emerald-500/10'
              : 'border-gray-600 hover:border-emerald-500/50 hover:bg-emerald-500/5'
            }
          `}
        >
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-300 mb-2 font-medium">
            {isDragActive
              ? 'Drop your files here...'
              : 'Drag documents or click to browse'
            }
          </p>
          <p className="text-gray-500 text-sm">
            PDF, JPEG, PNG, WebP • Max {maxFiles} files • 10MB per file
          </p>
          {enableAIVerification && (
            <div className="mt-3 flex items-center justify-center gap-2 text-emerald-400 text-xs">
              <Sparkles className="h-4 w-4" />
              <span>Automatic AI verification enabled</span>
            </div>
          )}
          <p className="text-gray-400 text-xs mt-2">
            {successfulFiles}/{maxFiles} uploaded
            {readyFiles > 0 && ` • ${readyFiles} pending`}
          </p>
        </div>
      )}

      {!uploadImmediately && readyFiles > 0 && !parcelId && (
        <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
          <p className="text-yellow-300 text-sm">
            📋 {readyFiles} file(s) will be uploaded after package creation
          </p>
        </div>
      )}

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-3"
          >
            {files.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col gap-3 p-4 bg-gray-800/40 rounded-lg border border-gray-700/50 relative"
              >
                <AnimatePresence mode="wait">
                  {file.status === 'verifying' && (
                    <ScanningAnimation isScanning={true} />
                  )}
                </AnimatePresence>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-700/50 rounded-lg">
                    {getFileIcon(file.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{file.originalName}</p>
                    <p className="text-gray-400 text-sm">{formatFileSize(file.size)}</p>
                    
                    {(file.status === 'uploading' || file.status === 'verifying') && file.progress !== undefined && (
                      <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
                        <div 
                          className="h-1.5 rounded-full transition-all duration-300 bg-emerald-500"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                    )}
                    
                    {file.status === 'error' && file.error && (
                      <p className="text-red-400 text-xs mt-1">{file.error}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {file.status === 'uploading' && (
                      <div className="animate-spin h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full" />
                    )}
                    
                    {file.status === 'verifying' && (
                      <div className="animate-spin h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full" />
                    )}
                    
                    {file.status === 'success' && (
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                    )}
                    
                    {file.status === 'ready' && (
                      <div className="h-4 w-4 border-2 border-yellow-500 border-dashed rounded-full" />
                    )}
                    
                    {file.status === 'error' && (
                      <>
                        <AlertCircle className="h-4 w-4 text-red-400" />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => retryUpload(file.id)}
                          className="text-emerald-400 hover:text-emerald-300 text-xs px-2 py-1"
                        >
                          Retry
                        </Button>
                      </>
                    )}
                    
                    {getStatusBadge(file)}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      disabled={file.status === 'uploading' || file.status === 'verifying'}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {file.aiVerification && file.status === 'success' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pl-14 border-l-2 border-gray-700 overflow-hidden"
                  >
                    {getAIVerificationBadge(file.aiVerification)}
                    
                    {file.aiVerification.findings && file.aiVerification.findings.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {file.aiVerification.findings.map((finding, idx) => (
                          <p key={idx} className="text-xs text-gray-400">• {finding}</p>
                        ))}
                      </div>
                    )}

                    {file.aiVerification.risks && file.aiVerification.risks.length > 0 && (
                      <div className="mt-2 p-2 bg-red-900/20 border border-red-700/50 rounded">
                        <p className="text-red-300 text-xs font-semibold mb-1">Detected Risks:</p>
                        {file.aiVerification.risks.map((risk, idx) => (
                          <p key={idx} className="text-xs text-red-400">⚠ {risk}</p>
                        ))}
                      </div>
                    )}

                    {file.aiVerification.extractedData && Object.keys(file.aiVerification.extractedData).length > 0 && (
                      <div className="mt-2 p-2 bg-emerald-900/20 border border-emerald-700/50 rounded">
                        <p className="text-emerald-300 text-xs font-semibold mb-1">Extracted Data:</p>
                        {Object.entries(file.aiVerification.extractedData).map(([key, value]) => (
                          <p key={key} className="text-xs text-emerald-400">
                            <span className="font-medium">{key}:</span> {String(value)}
                          </p>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileUpload;