import { FastifyInstance } from 'fastify';
import bcryptjs from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Email configuration
const emailTransporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.hostinger.com',
  port: Number(process.env.EMAIL_PORT) || 465,
  secure: true, // true pour le port 465 (SSL)
  auth: {
    user: process.env.EMAIL_USER, // ex: noreply@landfi.tiic-system.com
    pass: process.env.EMAIL_PASSWORD,
  },
});


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

async function sendEmailVerification(email: string, token: string) {
  const verifyLink = `https://landfi.tiic-system.com/auth/verify-email?token=${token}`;
  
  await emailTransporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Verify your email - Hedera Africa',
    html: `
      <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Hedera Africa!</h2>
        <p>Click the link below to verify your email:</p>
        <a href="${verifyLink}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
          Verify my email
        </a>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          Or copy this link: ${verifyLink}
        </p>
        <p style="color: #999; font-size: 12px;">This link expires in 24 hours.</p>
      </div>
    `,
  });
}

async function sendPasswordReset(email: string, token: string) {
  const resetLink = `https://landfi.tiic-system.com/auth/reset-password?token=${token}`;
  
  await emailTransporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Reset your password - Hedera Africa',
    html: `
      <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
          Reset my password
        </a>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          Or copy this link: ${resetLink}
        </p>
        <p style="color: #999; font-size: 12px;">This link expires in 1 hour.</p>
      </div>
    `,
  });
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

      await sendEmailVerification(email, emailVerificationToken);

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
        // Don't reveal if email exists (security)
        return reply.code(200).send({ 
          message: 'If this email exists, you will receive a password reset link'
        });
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: resetToken,
          passwordResetExpires: resetTokenExpires,
        },
      });

      await sendPasswordReset(email, resetToken);

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

  // Add this endpoint to your authRoutes.ts file

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
      // Don't reveal if email exists (security)
      return reply.code(200).send({
        message: 'If this email exists and is not verified, you will receive a verification link'
      });
    }

    // If email is already verified
    if (user.emailVerified) {
      return reply.code(200).send({
        message: 'This email is already verified'
      });
    }

    // Generate new verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken,
        emailVerificationExpires,
      },
    });

    await sendEmailVerification(email, emailVerificationToken);

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
  // Add this to your backend authRoutes.ts file

// Update Wallet - with detailed error messages
fastify.post('/user/wallet', {
  preHandler: [fastify.authenticate],
}, async (request, reply) => {
  try {
    const userId = (request.user as any).userId;
    const { walletHedera } = request.body as { walletHedera: string };

    // Validate wallet address format
    if (!walletHedera || typeof walletHedera !== 'string') {
      return reply.code(400).send({ 
        error: 'Invalid wallet address format',
        code: 'INVALID_WALLET_FORMAT'
      });
    }

    // Validate Hedera account ID format (0.0.xxxxx)
    const hederaAccountPattern = /^0\.0\.\d+$/;
    if (!hederaAccountPattern.test(walletHedera)) {
      return reply.code(400).send({ 
        error: 'Invalid Hedera account ID format. Expected format: 0.0.xxxxx',
        code: 'INVALID_HEDERA_FORMAT'
      });
    }

    // Check if wallet is already connected to another account
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

    // Update user wallet
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

    // Handle Prisma errors
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