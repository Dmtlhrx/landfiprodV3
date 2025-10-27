import { FastifyInstance } from 'fastify';
import bcryptjs from 'bcryptjs';
import { z } from 'zod';
import { Resend } from 'resend';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import crypto from 'crypto';

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY!);

const schemas = {
  register: z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'Minimum 8 characters').regex(/[A-Z]/, 'At least one uppercase letter').regex(/[0-9]/, 'At least one number'),
    displayName: z.string().min(2, 'Minimum 2 characters').max(50),
  }),
  login: z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(1, 'Password required'),
  }),
  forgotPassword: z.object({
    email: z.string().email('Invalid email'),
  }),
  resetPassword: z.object({
    token: z.string(),
    password: z.string().min(8, 'Minimum 8 characters'),
  }),
  verifyEmail: z.object({
    token: z.string(),
  }),
};

async function sendEmailVerification(email: string, token: string, displayName: string) {
  const verifyLink = `https://landfi.tiic-system.com/auth/verify-email?token=${token}`;
  
  try {
    logger.info(`Attempting to send verification email to: ${email}`);
    
    const { data, error } = await resend.emails.send({
      from: 'LandFi <noreply@tiic-system.com>', // Changez selon votre domaine vérifié
      to: email,
      subject: 'Verify your email address',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to LandFi!</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hello <strong>${displayName}</strong>,</p>
              <p style="font-size: 16px; margin-bottom: 20px;">
                Thank you for registering! Please verify your email address to complete your registration.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verifyLink}" 
                   style="background: #667eea; color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                  Verify Email Address
                </a>
              </div>
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                Or copy and paste this link into your browser:
              </p>
              <p style="font-size: 14px; color: #667eea; word-break: break-all;">
                ${verifyLink}
              </p>
              <p style="font-size: 14px; color: #999; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
                This link will expire in <strong>24 hours</strong>.<br>
                If you didn't create this account, you can safely ignore this email.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      throw new Error(error.message);
    }
    
    logger.info(`Verification email sent successfully for: ${email}`, { 
      emailId: data?.id 
    });
    
    return data;
  } catch (error: any) {
    logger.error('Failed to send verification email:', {
      email,
      error: error.message,
      stack: error.stack,
    });
    throw new Error(`Email verification failed: ${error.message}`);
  }
}

async function sendPasswordReset(email: string, token: string, displayName: string) {
  const resetLink = `https://landfi.tiic-system.com/auth/reset-password?token=${token}`;
  
  try {
    logger.info(`Attempting to send password reset email to: ${email}`);
    
    const { data, error } = await resend.emails.send({
      from: 'LandFi <noreply@tiic-system.com>', // Changez selon votre domaine vérifié
      to: email,
      subject: 'Reset your password',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hello <strong>${displayName}</strong>,</p>
              <p style="font-size: 16px; margin-bottom: 20px;">
                We received a request to reset your password. Click the button below to create a new password.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" 
                   style="background: #667eea; color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                  Reset Password
                </a>
              </div>
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                Or copy and paste this link into your browser:
              </p>
              <p style="font-size: 14px; color: #667eea; word-break: break-all;">
                ${resetLink}
              </p>
              <p style="font-size: 14px; color: #999; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
                This link will expire in <strong>1 hour</strong>.<br>
                If you didn't request a password reset, you can safely ignore this email.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      throw new Error(error.message);
    }
    
    logger.info(`Password reset email sent successfully for: ${email}`, { 
      emailId: data?.id 
    });
    
    return data;
  } catch (error: any) {
    logger.error('Failed to send password reset email:', {
      email,
      error: error.message,
      stack: error.stack,
    });
    throw new Error(`Password reset email failed: ${error.message}`);
  }
}

export async function authRoutes(fastify: FastifyInstance) {
  
  // Register with email verification
  fastify.post('/register', {
    schema: {
      body: zodToJsonSchema(schemas.register, 'registerSchema'),
    },
  }, async (request, reply) => {
    try {
      const { email, password, displayName } = schemas.register.parse(request.body);

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return reply.code(400).send({ 
          error: 'This email is already registered',
          code: 'EMAIL_EXISTS'
        });
      }

      const passwordHash = await bcryptjs.hash(password, 12);
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');
      const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          displayName,
          emailVerificationToken,
          emailVerificationExpires,
        },
        select: { id: true, email: true, displayName: true, createdAt: true },
      });

      // Send verification email via Resend
      await sendEmailVerification(email, emailVerificationToken, displayName);

      logger.info(`User registered with pending verification: ${email}`);

      return reply.code(201).send({ 
        message: 'Registration successful. Please verify your email.',
        user,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      logger.error('Registration error:', error);
      return reply.code(500).send({ error: 'Registration failed' });
    }
  });

  // Verify Email
  fastify.post('/verify-email', {
    schema: {
      body: zodToJsonSchema(schemas.verifyEmail, 'verifyEmailSchema'),
    },
  }, async (request, reply) => {
    try {
      const { token } = schemas.verifyEmail.parse(request.body);

      const user = await prisma.user.findFirst({
        where: {
          emailVerificationToken: token,
          emailVerificationExpires: { gt: new Date() },
        },
      });

      if (!user) {
        return reply.code(400).send({ 
          error: 'Invalid or expired link',
          code: 'INVALID_TOKEN'
        });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null,
        },
      });

      logger.info(`Email verified: ${user.email}`);

      return { message: 'Email verified successfully!' };
    } catch (error) {
      logger.error('Email verification error:', error);
      return reply.code(500).send({ error: 'Verification failed' });
    }
  });

  // Login - requires verified email
  fastify.post('/login', {
    schema: {
      body: zodToJsonSchema(schemas.login, 'loginSchema'),
    },
  }, async (request, reply) => {
    try {
      const { email, password } = schemas.login.parse(request.body);

      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        return reply.code(401).send({ 
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        });
      }

      if (!user.emailVerified) {
        return reply.code(403).send({ 
          error: 'Please verify your email first',
          code: 'EMAIL_NOT_VERIFIED'
        });
      }

      const isValidPassword = await bcryptjs.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return reply.code(401).send({ 
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        });
      }

      const accessToken = await reply.jwtSign({ userId: user.id });

      logger.info(`User logged in: ${user.email}`);

      return {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          walletHedera: user.walletHedera,
          role: user.role,
          did: user.did,
          createdAt: user.createdAt,
        },
        accessToken,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation failed',
          details: error.errors,
        });
      }

      logger.error('Login error:', error);
      return reply.code(500).send({ error: 'Login failed' });
    }
  });

  // Forgot Password
  fastify.post('/forgot-password', {
    schema: {
      body: zodToJsonSchema(schemas.forgotPassword, 'forgotPasswordSchema'),
    },
  }, async (request, reply) => {
    try {
      const { email } = schemas.forgotPassword.parse(request.body);

      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        return reply.code(200).send({ 
          message: 'If this email exists, you will receive a password reset link'
        });
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: resetToken,
          passwordResetExpires: resetTokenExpires,
        },
      });

      await sendPasswordReset(email, resetToken, user.displayName);

      logger.info(`Password reset requested: ${email}`);

      return reply.code(200).send({ 
        message: 'If this email exists, you will receive a password reset link'
      });
    } catch (error) {
      logger.error('Forgot password error:', error);
      return reply.code(500).send({ error: 'Request failed' });
    }
  });

  // Reset Password
  fastify.post('/reset-password', {
    schema: {
      body: zodToJsonSchema(schemas.resetPassword, 'resetPasswordSchema'),
    },
  }, async (request, reply) => {
    try {
      const { token, password } = schemas.resetPassword.parse(request.body);

      const user = await prisma.user.findFirst({
        where: {
          passwordResetToken: token,
          passwordResetExpires: { gt: new Date() },
        },
      });

      if (!user) {
        return reply.code(400).send({ 
          error: 'Invalid or expired link',
          code: 'INVALID_TOKEN'
        });
      }

      const passwordHash = await bcryptjs.hash(password, 12);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      });

      logger.info(`Password reset: ${user.email}`);

      return { message: 'Password reset successfully!' };
    } catch (error) {
      logger.error('Password reset error:', error);
      return reply.code(500).send({ error: 'Password reset failed' });
    }
  });

  // Refresh Token
  fastify.post('/refresh', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const userId = (request.user as any).userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          displayName: true,
          walletHedera: true,
          role: true,
          did: true,
          createdAt: true,
        },
      });

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      const accessToken = await reply.jwtSign({ userId: user.id });
      return { user, accessToken };
    } catch (error) {
      logger.error('Token refresh error:', error);
      return reply.code(500).send({ error: 'Token refresh failed' });
    }
  });

  // Resend Email Verification
  fastify.post('/resend-verification-email', {
    schema: {
      body: zodToJsonSchema(schemas.forgotPassword, 'resendVerificationSchema'),
    },
  }, async (request, reply) => {
    try {
      const { email } = schemas.forgotPassword.parse(request.body);

      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        return reply.code(200).send({
          message: 'If this email exists and is not verified, you will receive a verification link'
        });
      }

      if (user.emailVerified) {
        return reply.code(200).send({
          message: 'This email is already verified'
        });
      }

      const emailVerificationToken = crypto.randomBytes(32).toString('hex');
      const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerificationToken,
          emailVerificationExpires,
        },
      });

      await sendEmailVerification(email, emailVerificationToken, user.displayName);

      logger.info(`Verification email resent to: ${email}`);

      return reply.code(200).send({
        message: 'Verification email sent successfully'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      logger.error('Resend verification error:', error);
      return reply.code(500).send({ error: 'Failed to resend verification email' });
    }
  });

  // Update Wallet
  fastify.post('/user/wallet', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const userId = (request.user as any).userId;
      const { walletHedera } = request.body as { walletHedera: string };

      if (!walletHedera || typeof walletHedera !== 'string') {
        return reply.code(400).send({ 
          error: 'Invalid wallet address format',
          code: 'INVALID_WALLET_FORMAT'
        });
      }

      const hederaAccountPattern = /^0\.0\.\d+$/;
      if (!hederaAccountPattern.test(walletHedera)) {
        return reply.code(400).send({ 
          error: 'Invalid Hedera account ID format. Expected format: 0.0.xxxxx',
          code: 'INVALID_HEDERA_FORMAT'
        });
      }

      const existingWallet = await prisma.user.findFirst({
        where: { 
          walletHedera,
          NOT: { id: userId }
        },
        select: {
          email: true,
          displayName: true,
        }
      });

      if (existingWallet) {
        return reply.code(409).send({ 
          error: `This wallet is already connected to another account (${existingWallet.email})`,
          code: 'WALLET_ALREADY_CONNECTED',
          details: {
            connectedToEmail: existingWallet.email,
            connectedToDisplayName: existingWallet.displayName,
          }
        });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { walletHedera },
        select: {
          id: true,
          email: true,
          displayName: true,
          walletHedera: true,
          role: true,
          did: true,
          createdAt: true,
        },
      });

      logger.info(`Wallet connected for user ${updatedUser.email}: ${walletHedera}`);

      return { 
        message: 'Wallet connected successfully',
        user: updatedUser 
      };

    } catch (error) {
      logger.error('Update wallet error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Unique constraint')) {
          return reply.code(409).send({ 
            error: 'This wallet is already connected to another account',
            code: 'WALLET_ALREADY_CONNECTED'
          });
        }

        if (error.message.includes('Record to update not found')) {
          return reply.code(404).send({ 
            error: 'User account not found',
            code: 'USER_NOT_FOUND'
          });
        }
      }

      return reply.code(500).send({ 
        error: 'Failed to update wallet. Please try again.',
        code: 'WALLET_UPDATE_FAILED'
      });
    }
  });
}