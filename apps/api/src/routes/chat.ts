// Backend: Real-time Chat with WebSocket support
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import WebSocket from 'ws';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// ============= TYPES =============
type WsMessage = {
  type: 'MESSAGE' | 'TYPING' | 'READ' | 'ONLINE' | 'OFFLINE' | 'DELETE' | 'EDIT';
  conversationId: string;
  userId: string;
  data: any;
  timestamp: string;
};

// WebSocket connection type
interface WebSocketConnection {
  socket: WebSocket;
}

// ============= WEBSOCKET MANAGER =============
class ChatWSManager {
  private connections = new Map<string, Map<string, WebSocket>>();
  private typingUsers = new Map<string, Set<string>>();

  addConnection(conversationId: string, userId: string, ws: WebSocket) {
    if (!this.connections.has(conversationId)) {
      this.connections.set(conversationId, new Map());
    }
    this.connections.get(conversationId)!.set(userId, ws);
    this.broadcastEvent(conversationId, 'ONLINE', { userId });
  }

  removeConnection(conversationId: string, userId: string) {
    const conv = this.connections.get(conversationId);
    if (conv) {
      conv.delete(userId);
      if (conv.size === 0) {
        this.connections.delete(conversationId);
      }
    }
    this.typingUsers.get(conversationId)?.delete(userId);
    this.broadcastEvent(conversationId, 'OFFLINE', { userId });
  }

  broadcast(conversationId: string, message: WsMessage) {
    const conv = this.connections.get(conversationId);
    if (!conv) return;

    const payload = JSON.stringify(message);
    conv.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }

  broadcastEvent(conversationId: string, type: string, data: any) {
    this.broadcast(conversationId, {
      type: type as any,
      conversationId,
      userId: data.userId,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  setTyping(conversationId: string, userId: string) {
    if (!this.typingUsers.has(conversationId)) {
      this.typingUsers.set(conversationId, new Set());
    }
    this.typingUsers.get(conversationId)!.add(userId);

    setTimeout(() => {
      this.typingUsers.get(conversationId)?.delete(userId);
      this.broadcastEvent(conversationId, 'TYPING', {
        userId,
        isTyping: false,
      });
    }, 3000);

    this.broadcastEvent(conversationId, 'TYPING', {
      userId,
      isTyping: true,
      typingUsers: Array.from(this.typingUsers.get(conversationId) || []),
    });
  }

  getOnlineUsers(conversationId: string): string[] {
    const conv = this.connections.get(conversationId);
    return conv ? Array.from(conv.keys()) : [];
  }
}

const wsManager = new ChatWSManager();

// ============= SCHEMAS ============
const sendMessageSchema = z.object({
  content: z.string().max(5000).optional(),
  messageType: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT']).default('TEXT'),
  replyToId: z.string().optional(),
});

// ============= FILE UPLOAD CONFIG ============
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'chat');
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm',
  'audio/mpeg', 'audio/wav',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

// ============= ROUTES ============
export async function chatRoutes(fastify: FastifyInstance) {
  await ensureUploadDir();

  // ===== GET OR CREATE CHAT BY CONTEXT (parcel/loan) =====
  fastify.get(
    '/:contextType/:contextId',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request.user as any).userId;
      const { contextType, contextId } = request.params as { 
        contextType: string; 
        contextId: string 
      };

      if (!['parcel', 'loan'].includes(contextType)) {
        return reply.code(400).send({ error: 'Invalid context type' });
      }

      try {
        // 1. Chercher une conversation existante
        const whereClause: any = {
          participants: { some: { userId, isActive: true } }
        };

        if (contextType === 'parcel') {
          whereClause.parcelId = contextId;
        } else {
          whereClause.loanId = contextId;
        }

        let conversation = await prisma.chatConversation.findFirst({
          where: whereClause,
          include: {
            participants: { 
              include: { 
                user: {
                  select: {
                    id: true,
                    displayName: true,
                    email: true,
                    walletHedera: true,
                    reputationScore: true,
                  }
                } 
              } 
            },
            messages: { 
              orderBy: { createdAt: 'asc' },
              include: { sender: true }
            },
            parcel: {
              select: {
                id: true,
                title: true,
                priceUsd: true,
                areaM2: true,
                verificationType: true,
                ownerId: true,
              }
            },
            loan: {
              select: {
                id: true,
                principalUsd: true,
                interestRate: true,
                status: true,
                borrowerId: true,
                lenderId: true,
              }
            },
          }
        });

        // 2. Si pas trouvée, créer automatiquement
        if (!conversation) {
          let otherUserId: string;
          
          if (contextType === 'parcel') {
            const parcel = await prisma.parcel.findUnique({
              where: { id: contextId },
              select: { ownerId: true }
            });
            
            if (!parcel) {
              return reply.code(404).send({ 
                success: false,
                error: 'Parcel not found' 
              });
            }
            
            if (parcel.ownerId === userId) {
              return reply.code(400).send({ 
                success: false,
                error: 'Cannot chat with yourself' 
              });
            }
            
            otherUserId = parcel.ownerId;
          } else {
            const loan = await prisma.p2PLoan.findUnique({
              where: { id: contextId },
              select: { borrowerId: true, lenderId: true }
            });
            
            if (!loan) {
              return reply.code(404).send({ 
                success: false,
                error: 'Loan not found' 
              });
            }
            
            if (loan.borrowerId === userId) {
              if (!loan.lenderId) {
                return reply.code(400).send({ 
                  success: false,
                  error: 'No lender assigned yet' 
                });
              }
              otherUserId = loan.lenderId;
            } else {
              otherUserId = loan.borrowerId;
            }
          }

          conversation = await prisma.chatConversation.create({
            data: {
              type: 'DIRECT',
              parcelId: contextType === 'parcel' ? contextId : undefined,
              loanId: contextType === 'loan' ? contextId : undefined,
              createdBy: userId,
              participants: {
                create: [
                  { userId, role: 'MEMBER', isActive: true },
                  { userId: otherUserId, role: 'MEMBER', isActive: true }
                ]
              }
            },
            include: {
              participants: { 
                include: { 
                  user: {
                    select: {
                      id: true,
                      displayName: true,
                      email: true,
                      walletHedera: true,
                      reputationScore: true,
                    }
                  } 
                } 
              },
              messages: { 
                orderBy: { createdAt: 'asc' },
                include: { sender: true }
              },
              parcel: {
                select: {
                  id: true,
                  title: true,
                  priceUsd: true,
                  areaM2: true,
                  verificationType: true,
                  ownerId: true,
                }
              },
              loan: {
                select: {
                  id: true,
                  principalUsd: true,
                  interestRate: true,
                  status: true,
                  borrowerId: true,
                  lenderId: true,
                }
              },
            }
          });

          logger.info(`Auto-created conversation ${conversation.id} for ${contextType}:${contextId}`);
        }

        // 3. Marquer comme lu
        await prisma.chatParticipant.update({
          where: {
            conversationId_userId: { 
              conversationId: conversation.id, 
              userId 
            },
          },
          data: {
            lastReadAt: new Date(),
            unreadCount: 0,
          },
        });

        // 4. Formater la réponse
        const otherParticipant = conversation.participants.find(p => p.userId !== userId);
        
        const response = {
          success: true,
          messages: conversation.messages.map(msg => ({
            id: msg.id,
            senderId: msg.senderId,
            senderName: msg.sender.displayName,
            message: msg.content,
            messageType: msg.messageType,
            fileUrl: msg.fileUrl,
            fileName: msg.fileName,
            fileSize: msg.fileSize,
            timestamp: msg.createdAt.toISOString(),
            isRead: msg.isRead,
          })),
          participant: otherParticipant?.user || null,
          context: {
            type: contextType === 'parcel' ? 'PARCEL_SALE' : 'LOAN_DISCUSSION',
            parcel: conversation.parcel,
            loan: conversation.loan,
          },
          conversationId: conversation.id,
        };

        return reply.send(response);
      } catch (error: any) {
        logger.error('Get or create chat error:', error);
        return reply.code(500).send({ 
          success: false,
          error: 'Failed to load or create chat',
          details: error.message
        });
      }
    }
  );

  // ===== SEND MESSAGE WITH FILE =====
  fastify.post(
    '/:contextType/:contextId/messages',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request.user as any).userId;
      const { contextType, contextId } = request.params as { contextType: string; contextId: string };

      try {
        const whereClause: any = {
          participants: { some: { userId, isActive: true } }
        };

        if (contextType === 'parcel') {
          whereClause.parcelId = contextId;
        } else {
          whereClause.loanId = contextId;
        }

        let conversation = await prisma.chatConversation.findFirst({
          where: whereClause,
        });

        if (!conversation) {
          return reply.code(404).send({ 
            success: false,
            error: 'Conversation not found. Please reload the page.' 
          });
        }

        const conversationId = conversation.id;

        const contentType = request.headers['content-type'] as string | undefined;
        const isMultipart = !!contentType && contentType.includes('multipart/form-data');

        let content = '';
        let messageType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' = 'TEXT';
        let fileData: any = null;

        if (isMultipart) {
          const data: any = await (request as any).file();
          if (data) {
            const buffer: Buffer = await data.toBuffer();
            const fileName: string = data.filename;
            const mimeType: string = data.mimetype;

            if (buffer.length > MAX_FILE_SIZE) {
              return reply.code(400).send({ error: 'File too large' });
            }

            if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
              return reply.code(400).send({ error: 'File type not allowed' });
            }

            messageType = mimeType.startsWith('image/')
              ? 'IMAGE'
              : mimeType.startsWith('video/')
              ? 'VIDEO'
              : mimeType.startsWith('audio/')
              ? 'AUDIO'
              : 'DOCUMENT';

            const ext = path.extname(fileName);
            const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
            const filePath = path.join(UPLOAD_DIR, uniqueName);

            await fs.writeFile(filePath, buffer);

            fileData = {
              url: `/api/chat/files/${uniqueName}`,
              name: fileName,
              size: buffer.length,
              mimeType,
            };

            const fields = data.fields || {};
            if (fields.message) {
              content = (fields.message as any).value || '';
            }
          }
        } else {
          const validation = sendMessageSchema.safeParse(request.body);
          if (!validation.success) {
            return reply.code(400).send({ error: 'Validation error' });
          }
          content = validation.data.content || '';
          messageType = validation.data.messageType;
        }

        const chatMessage = await prisma.chatMessage.create({
          data: {
            conversationId,
            senderId: userId,
            content,
            messageType,
            fileUrl: fileData?.url,
            fileName: fileData?.name,
            fileSize: fileData?.size,
            mimeType: fileData?.mimeType,
          },
          include: { sender: true, replyTo: true },
        });

        await prisma.chatConversation.update({
          where: { id: conversationId },
          data: { lastMessageAt: new Date() },
        });

        wsManager.broadcast(conversationId, {
          type: 'MESSAGE',
          conversationId,
          userId,
          data: chatMessage,
          timestamp: new Date().toISOString(),
        });

        await prisma.chatParticipant.updateMany({
          where: {
            conversationId,
            NOT: { userId },
          },
          data: {
            unreadCount: { increment: 1 },
          },
        });

        return reply.code(201).send({
          success: true,
          message: {
            id: chatMessage.id,
            senderId: chatMessage.senderId,
            senderName: chatMessage.sender.displayName,
            message: chatMessage.content,
            messageType: chatMessage.messageType,
            fileUrl: chatMessage.fileUrl,
            fileName: chatMessage.fileName,
            fileSize: chatMessage.fileSize,
            timestamp: chatMessage.createdAt.toISOString(),
            isRead: chatMessage.isRead,
          },
        });
      } catch (error: any) {
        logger.error('Send message error:', error);
        return reply.code(500).send({ 
          success: false,
          error: 'Failed to send message' 
        });
      }
    }
  );

  // ===== WEBSOCKET HANDLER =====
  // Use type assertion to bypass TypeScript checking for websocket option
  (fastify as any).get(
    '/:conversationId/ws',
    { websocket: true } as any,
    async (connection: WebSocketConnection, request: FastifyRequest) => {
      const socket = connection.socket;
      const token = ((request.query as any) || {}).token as string;
      const { conversationId } = (request.params as any) as { conversationId: string };

      if (!token) {
        socket.close(1008, 'Unauthorized');
        return;
      }

      try {
        const decoded = fastify.jwt.verify(token) as any;
        const userId = decoded.userId;

        const participant = await prisma.chatParticipant.findUnique({
          where: {
            conversationId_userId: { conversationId, userId },
          },
        });

        if (!participant) {
          socket.close(1008, 'Unauthorized');
          return;
        }

        wsManager.addConnection(conversationId, userId, socket);
        logger.info(`User ${userId} connected to conversation ${conversationId}`);

        socket.on('message', async (rawData: WebSocket.Data) => {
          try {
            const text = typeof rawData === 'string' ? rawData : rawData.toString();
            const msg = JSON.parse(text) as WsMessage;

            switch (msg.type) {
              case 'TYPING':
                wsManager.setTyping(conversationId, userId);
                break;

              case 'MESSAGE':
                await handleNewMessage(msg, userId, conversationId);
                break;

              case 'READ':
                await prisma.chatMessage.update({
                  where: { id: msg.data.messageId },
                  data: { isRead: true },
                });
                wsManager.broadcastEvent(conversationId, 'READ', {
                  messageId: msg.data.messageId,
                  userId,
                });
                break;

              case 'DELETE':
                {
                  const msgToDelete = await prisma.chatMessage.findUnique({
                    where: { id: msg.data.messageId },
                  });
                  if (msgToDelete?.senderId === userId) {
                    await prisma.chatMessage.delete({
                      where: { id: msg.data.messageId },
                    });
                    wsManager.broadcast(conversationId, {
                      type: 'DELETE',
                      conversationId,
                      userId,
                      data: { messageId: msg.data.messageId },
                      timestamp: new Date().toISOString(),
                    });
                  }
                }
                break;

              case 'EDIT':
                {
                  const msgToEdit = await prisma.chatMessage.findUnique({
                    where: { id: msg.data.messageId },
                  });
                  if (msgToEdit?.senderId === userId) {
                    const updated = await prisma.chatMessage.update({
                      where: { id: msg.data.messageId },
                      data: {
                        content: msg.data.content,
                        isEdited: true,
                        editedAt: new Date(),
                      },
                      include: { sender: true },
                    });
                    wsManager.broadcast(conversationId, {
                      type: 'EDIT',
                      conversationId,
                      userId,
                      data: updated,
                      timestamp: new Date().toISOString(),
                    });
                  }
                }
                break;
            }
          } catch (error) {
            logger.error('WS message error:', error);
          }
        });

        socket.on('close', () => {
          wsManager.removeConnection(conversationId, userId);
          logger.info(`User ${userId} disconnected from conversation ${conversationId}`);
        });

        socket.on('error', (error) => {
          logger.error('WS error:', error);
          wsManager.removeConnection(conversationId, userId);
        });
      } catch (error) {
        logger.error('WS auth error:', error);
        socket.close(1008, 'Unauthorized');
      }
    }
  );

  // ===== FILE DOWNLOAD =====
  fastify.get(
    '/files/:fileName',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { fileName } = request.params as { fileName: string };

      try {
        if (fileName.includes('..') || fileName.includes('/')) {
          return reply.code(403).send({ error: 'Invalid file name' });
        }

        const filePath = path.join(UPLOAD_DIR, fileName);
        return reply.sendFile(fileName, path.dirname(filePath));
      } catch (error) {
        logger.error('File download error:', error);
        return reply.code(500).send({ error: 'Failed to download file' });
      }
    }
  );
}

// ===== HELPER: Handle new message =====
async function handleNewMessage(msg: WsMessage, userId: string, conversationId: string) {
  try {
    const chatMessage = await prisma.chatMessage.create({
      data: {
        conversationId,
        senderId: userId,
        content: msg.data.content,
        messageType: msg.data.messageType || 'TEXT',
        replyToId: msg.data.replyToId,
      },
      include: { sender: true, replyTo: true },
    });

    await prisma.chatConversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    await prisma.chatParticipant.updateMany({
      where: {
        conversationId,
        NOT: { userId },
      },
      data: {
        unreadCount: { increment: 1 },
      },
    });

    wsManager.broadcast(conversationId, {
      type: 'MESSAGE',
      conversationId,
      userId,
      data: chatMessage,
      timestamp: new Date().toISOString(),
    });

    logger.info(`Message created: ${chatMessage.id}`);
  } catch (error) {
    logger.error('Handle message error:', error);
  }
}