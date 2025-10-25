import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Send,
  MessageCircle,
  MapPin,
  DollarSign,
  Mail,
  Star,
  Paperclip,
  File,
  X,
  AlertCircle,
} from 'lucide-react';
import { Button, Card, CardContent, Avatar, BeninPatternBackground } from '@hedera-africa/ui';
import Header from '@/components/Layout/Header';
import { useApi } from '@/hooks/useApi';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, formatDateTime } from '@/utils/formatters';

// Types
interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message?: string | null;
  messageType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  timestamp: string;
  isRead: boolean;
}

interface ChatParticipant {
  id: string;
  displayName: string;
  email: string;
  walletHedera?: string | null;
  reputationScore: number;
}

interface ChatContext {
  type: 'PARCEL_SALE' | 'LOAN_DISCUSSION';
  parcel?: {
    id: string;
    title: string;
    priceUsd?: number | null;
    areaM2: number;
    verificationType: 'VERIFIED' | 'UNVERIFIED';
  };
  loan?: {
    id: string;
    principalUsd: number;
    interestRate: number;
    status: string;
  };
}

type WsMessageType = 'MESSAGE' | 'TYPING' | 'READ' | 'ONLINE' | 'OFFLINE' | 'DELETE' | 'EDIT';

interface WsMessage {
  type: WsMessageType;
  conversationId: string;
  userId: string;
  data: any;
  timestamp: string;
}

const ChatPage: React.FC = () => {
  // Get contextId from URL params (this is the parcel ID or loan ID)
  const { contextId } = useParams<{ contextId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const contextType = searchParams.get('type') || 'loan';
  
  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [participant, setParticipant] = useState<ChatParticipant | null>(null);
  const [context, setContext] = useState<ChatContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [wsConnected, setWsConnected] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const conversationIdRef = useRef<string>('');

  // Stores and hooks
  const { user } = useAuthStore();
  const api = useApi();

  // Effects
  useEffect(() => {
    if (contextType && contextId) {
      loadChatData();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [contextType, contextId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Functions
  const loadChatData = async () => {
    try {
      setError(null);
      setLoading(true);
      
      // Call backend with contextType (parcel/loan) and contextId (parcel ID or loan ID)
      const response = await api.get(`api/chat/${contextType}/${contextId}`);

      if (response?.success) {
        setMessages(response.messages || []);
        setParticipant(response.participant);
        setContext(response.context);
        // Store the conversation ID returned by backend
        conversationIdRef.current = response.conversationId;
        connectWebSocket(response.conversationId);
      } else {
        throw new Error(response?.error || 'Invalid response format');
      }
    } catch (error: any) {
      console.error('Failed to load chat data:', error);
      setError(error.message || 'Failed to load chat');
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = (conversationId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Authentication required');
        return;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/chat/${conversationId}/ws?token=${token}`;

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setWsConnected(true);
        setError(null);
      };

      wsRef.current.onmessage = (event: MessageEvent) => {
        try {
          const msg: WsMessage = JSON.parse(event.data);
          handleWsMessage(msg);
        } catch (err) {
          console.error('Error parsing WS message:', err);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error. Retrying...');
        scheduleReconnect(conversationId);
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setWsConnected(false);
        scheduleReconnect(conversationId);
      };
    } catch (err) {
      console.error('Failed to connect WebSocket:', err);
      setError('Failed to establish connection');
    }
  };

  const scheduleReconnect = (conversationId: string) => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    reconnectTimeoutRef.current = setTimeout(() => {
      console.log('Attempting to reconnect WebSocket...');
      connectWebSocket(conversationId);
    }, 3000);
  };

  const handleWsMessage = (msg: WsMessage) => {
    switch (msg.type) {
      case 'MESSAGE':
        setMessages((prev) => [...prev, msg.data]);
        break;

      case 'TYPING':
        if (msg.userId !== user?.id) {
          if (msg.data.isTyping) {
            setTypingUsers((prev) => new Set([...prev, msg.userId]));
          } else {
            setTypingUsers((prev) => {
              const updated = new Set(prev);
              updated.delete(msg.userId);
              return updated;
            });
          }
        }
        break;

      case 'ONLINE':
        setOnlineUsers((prev) => {
          if (!prev.includes(msg.userId)) {
            return [...prev, msg.userId];
          }
          return prev;
        });
        break;

      case 'OFFLINE':
        setOnlineUsers((prev) => prev.filter((uid) => uid !== msg.userId));
        break;

      case 'READ':
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.data.messageId ? { ...m, isRead: true } : m
          )
        );
        break;

      case 'DELETE':
        setMessages((prev) => prev.filter((m) => m.id !== msg.data.messageId));
        break;

      case 'EDIT':
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.data.id ? { ...m, message: msg.data.content } : m
          )
        );
        break;
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert('Fichier trop volumineux. Maximum 50MB.');
      return;
    }

    setSelectedFile(file);
    setError(null);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTyping = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'TYPING',
          data: { isTyping: true },
        })
      );
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'TYPING',
            data: { isTyping: false },
          })
        );
      }
    }, 3000);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return;

    setSending(true);
    setError(null);

    try {
      if (selectedFile) {
        await sendMessageWithFile();
      } else if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'MESSAGE',
            data: {
              content: newMessage.trim(),
              messageType: 'TEXT',
            },
          })
        );
        setNewMessage('');
        scrollToBottom();
      } else {
        await sendMessageHTTP();
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
      setUploadProgress(0);
    }
  };

  const sendMessageWithFile = async () => {
    try {
      const formData = new FormData();
      if (selectedFile) formData.append('file', selectedFile);
      if (newMessage.trim()) formData.append('message', newMessage.trim());

      const response = await api.post(
        `api/chat/${contextType}/${contextId}/messages`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent: any) => {
            if (progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(progress);
            }
          },
        }
      );

      if (response?.success) {
        setMessages((prev) => [...prev, response.message]);
        setNewMessage('');
        removeSelectedFile();
        scrollToBottom();
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error: any) {
      throw error;
    }
  };

  const sendMessageHTTP = async () => {
    try {
      const response = await api.post(
        `api/chat/${contextType}/${contextId}/messages`,
        {
          content: newMessage.trim(),
          messageType: 'TEXT',
        }
      );

      if (response?.success) {
        setMessages((prev) => [...prev, response.message]);
        setNewMessage('');
        scrollToBottom();
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error: any) {
      throw error;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const renderMessage = (message: ChatMessage) => {
    const isOwn = message.senderId === user?.id;

    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
      >
        <div className={`flex gap-2 max-w-[70%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
          {!isOwn && (
            <Avatar
              fallback={participant?.displayName?.charAt(0) || 'U'}
              size="sm"
              className="mt-1 flex-shrink-0"
            />
          )}

          <div className={`flex flex-col gap-1 ${isOwn ? 'items-end' : 'items-start'}`}>
            {message.messageType === 'TEXT' && message.message && (
              <div
                className={`px-4 py-2 rounded-lg ${
                  isOwn ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-100'
                }`}
              >
                <p className="text-sm break-words whitespace-pre-wrap">{message.message}</p>
              </div>
            )}

            {message.messageType === 'IMAGE' && message.fileUrl && (
              <img
                src={message.fileUrl}
                alt="shared"
                className="rounded-lg max-h-80 object-cover cursor-pointer"
                onClick={() => window.open(message.fileUrl!, '_blank')}
              />
            )}

            {message.messageType === 'VIDEO' && message.fileUrl && (
              <video src={message.fileUrl} controls className="rounded-lg max-h-80 max-w-full" />
            )}

            {message.messageType === 'AUDIO' && message.fileUrl && (
              <audio src={message.fileUrl} controls className="rounded-lg" />
            )}

            {message.messageType === 'DOCUMENT' && message.fileUrl && (
              <a
                href={message.fileUrl}
                download={message.fileName || 'document'}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg hover:opacity-80 ${
                  isOwn ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-100'
                }`}
              >
                <File className="h-4 w-4" />
                <span className="text-sm">{message.fileName || 'File'}</span>
              </a>
            )}

            <p className={`text-xs px-2 ${isOwn ? 'text-blue-200' : 'text-gray-500'}`}>
              {formatDateTime(message.timestamp)}
            </p>
          </div>
        </div>
      </motion.div>
    );
  };

  // Render
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 relative">
        <BeninPatternBackground className="fixed inset-0" />
        <Header />
        <div className="relative pt-8 pb-12 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-6 bg-dark-700/30 rounded w-1/4" />
              <div className="h-96 bg-dark-700/30 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isParticipantOnline = onlineUsers.includes(participant?.id || '');

  return (
    <div className="min-h-screen bg-dark-950 relative">
      <BeninPatternBackground className="fixed inset-0" />
      <Header />

      <div className="relative pt-8 pb-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Navigation */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-6">
            <button
              onClick={() => navigate(contextType === 'parcel' ? '/marketplace' : '/p2p-loans')}
              className="inline-flex items-center gap-2 text-gray-400 hover:text-primary-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </button>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Chat Main */}
            <div className="lg:col-span-2">
              <Card className="flex flex-col h-[600px]">
                {/* Header */}
                <div className="p-4 border-b border-dark-600/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <h3 className="font-semibold text-white">
                          {participant?.displayName || 'User'}
                        </h3>
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              isParticipantOnline ? 'bg-green-500' : 'bg-gray-500'
                            }`}
                          />
                          <span className="text-xs text-gray-400">
                            {isParticipantOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {wsConnected && (
                        <span className="text-green-400">● Connected</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <MessageCircle className="h-12 w-12 text-gray-600 mb-4" />
                      <p className="text-gray-400">Start the conversation</p>
                    </div>
                  ) : (
                    messages.map(renderMessage)
                  )}

                  {typingUsers.size > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* File Preview */}
                {selectedFile && (
                  <div className="px-4 py-3 border-t border-gray-700 bg-gray-900">
                    <div className="flex items-center gap-3">
                      {previewUrl ? (
                        <img src={previewUrl} alt="preview" className="h-16 w-16 object-cover rounded" />
                      ) : (
                        <div className="h-16 w-16 bg-gray-800 rounded flex items-center justify-center">
                          <File className="h-8 w-8 text-gray-500" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm text-white truncate">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button onClick={removeSelectedFile} className="text-gray-400 hover:text-gray-200">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    {uploadProgress > 0 && uploadProgress < 100 && (
                      <div className="mt-2 bg-gray-700 rounded-full h-1 overflow-hidden">
                        <div
                          className="bg-blue-500 h-1 transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="px-4 py-2 bg-red-900/20 border-t border-red-900/50">
                    <div className="flex items-center gap-2 text-red-400 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      {error}
                    </div>
                  </div>
                )}

                {/* Input */}
                <div className="p-4 border-t border-gray-700">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        if (e.target.value) handleTyping();
                      }}
                      onKeyPress={handleKeyPress}
                      placeholder="Type a message..."
                      disabled={sending}
                      className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg placeholder-gray-500 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-gray-400 hover:text-gray-200"
                      disabled={sending}
                    >
                      <Paperclip className="h-5 w-5" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                      accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                    />

                    <button
                      onClick={sendMessage}
                      disabled={(!newMessage.trim() && !selectedFile) || sending}
                      className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {context && (
                <Card>
                  <CardContent>
                    <h3 className="font-semibold text-white mb-3">Details</h3>
                    {context.parcel && (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-blue-400" />
                          <span className="text-gray-300">{context.parcel.title}</span>
                        </div>
                        {context.parcel.priceUsd && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-400" />
                            <span className="text-gray-300">{formatCurrency(context.parcel.priceUsd)}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {context.loan && (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-400" />
                          <span className="text-gray-300">{formatCurrency(context.loan.principalUsd)}</span>
                        </div>
                        <div className="text-gray-400">
                          Interest: {context.loan.interestRate}%
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {participant && (
                <Card>
                  <CardContent>
                    <h3 className="font-semibold text-white mb-3">Contact</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <a href={`mailto:${participant.email}`} className="text-blue-400 truncate">
                          {participant.email}
                        </a>
                      </div>
                      {participant.reputationScore > 0 && (
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-yellow-400" />
                          <span className="text-gray-300">{participant.reputationScore}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;