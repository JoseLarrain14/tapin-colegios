import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../utils/prisma.js';
import { config } from '../config/env.js';

const SALT_ROUNDS = 10;

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  relationship: 'father' | 'mother' | 'guardian' | 'other';
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  user: {
    id: string;
    email: string;
    role: string;
    emailVerified: boolean;
    guardian?: {
      id: string;
      firstName: string;
      lastName: string;
      relationship: string;
    };
  };
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  /**
   * Register a new guardian user
   */
  async register(input: RegisterInput): Promise<AuthResult> {
    const { email, password, firstName, lastName, relationship } = input;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Validate password
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user and guardian in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          role: 'guardian',
          emailVerified: false,
        },
      });

      const guardian = await tx.guardian.create({
        data: {
          userId: user.id,
          firstName,
          lastName,
          relationship,
        },
      });

      return { user, guardian };
    });

    // Generate tokens
    const accessToken = await this.generateAccessToken(result.user.id);
    const refreshToken = await this.generateRefreshToken(result.user.id);

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        emailVerified: result.user.emailVerified,
        guardian: {
          id: result.guardian.id,
          firstName: result.guardian.firstName,
          lastName: result.guardian.lastName,
          relationship: result.guardian.relationship,
        },
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Login an existing user
   */
  async login(input: LoginInput): Promise<AuthResult> {
    const { email, password } = input;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { guardian: true },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (!user.active) {
      throw new Error('Account is deactivated');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generate tokens
    const accessToken = await this.generateAccessToken(user.id);
    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        guardian: user.guardian
          ? {
              id: user.guardian.id,
              firstName: user.guardian.firstName,
              lastName: user.guardian.lastName,
              relationship: user.guardian.relationship,
            }
          : undefined,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    // Hash the token to find it
    const tokenHash = this.hashToken(refreshToken);

    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!storedToken) {
      throw new Error('Invalid or expired refresh token');
    }

    // Revoke old token (token rotation)
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    // Generate new tokens
    const newAccessToken = await this.generateAccessToken(storedToken.userId);
    const newRefreshToken = await this.generateRefreshToken(storedToken.userId);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Logout - revoke refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);

    await prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revoked: true },
    });
  }

  /**
   * Get current user info
   */
  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { guardian: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      guardian: user.guardian
        ? {
            id: user.guardian.id,
            firstName: user.guardian.firstName,
            lastName: user.guardian.lastName,
            relationship: user.guardian.relationship,
            phone: user.guardian.phone,
            rut: user.guardian.rut,
          }
        : undefined,
    };
  }

  /**
   * Generate JWT access token
   */
  private async generateAccessToken(userId: string): Promise<string> {
    // Simple JWT implementation for now
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        sub: userId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 15 * 60, // 15 minutes
      })
    ).toString('base64url');

    const signature = crypto
      .createHmac('sha256', config.jwtSecret)
      .update(`${header}.${payload}`)
      .digest('base64url');

    return `${header}.${payload}.${signature}`;
  }

  /**
   * Generate refresh token and store it
   */
  private async generateRefreshToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);

    // Parse refresh token expiration (e.g., "7d" -> 7 days)
    const expiresIn = config.refreshTokenExpiresIn;
    const days = parseInt(expiresIn.replace('d', '')) || 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return token;
  }

  /**
   * Hash a token for storage
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Verify and decode JWT access token
   */
  verifyAccessToken(token: string): { userId: string } | null {
    try {
      const [header, payload, signature] = token.split('.');

      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', config.jwtSecret)
        .update(`${header}.${payload}`)
        .digest('base64url');

      if (signature !== expectedSignature) {
        return null;
      }

      // Decode payload
      const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());

      // Check expiration
      if (decoded.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return { userId: decoded.sub };
    } catch {
      return null;
    }
  }
}

export const authService = new AuthService();
