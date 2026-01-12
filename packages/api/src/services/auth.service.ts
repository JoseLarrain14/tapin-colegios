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
  async register(input: RegisterInput): Promise<AuthResult> {
    const { email, password, firstName, lastName, relationship } = input;

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new Error('Email already registered');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

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

  async login(input: LoginInput): Promise<AuthResult> {
    const { email, password } = input;

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

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

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

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
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

    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    const newAccessToken = await this.generateAccessToken(storedToken.userId);
    const newRefreshToken = await this.generateRefreshToken(storedToken.userId);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);

    await prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revoked: true },
    });
  }

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

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      console.log('[FORGOT PASSWORD] Email not found: ' + email);
      return { message: 'Si el correo existe, recibiras un enlace para restablecer tu contrasena' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(resetToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const resetLink = (config.appUrl || 'http://localhost:8081') + '/reset-password?token=' + resetToken;
    console.log('');
    console.log('========================================================================');
    console.log('              PASSWORD RESET REQUEST                                    ');
    console.log('========================================================================');
    console.log('  Email: ' + email);
    console.log('  Token: ' + resetToken);
    console.log('  Expires: ' + expiresAt.toISOString());
    console.log('------------------------------------------------------------------------');
    console.log('  Reset Link (copy this):');
    console.log('  ' + resetLink);
    console.log('========================================================================');
    console.log('');

    return { message: 'Si el correo existe, recibiras un enlace para restablecer tu contrasena' };
  }

  async verifyResetToken(token: string): Promise<{ valid: boolean; userId?: string }> {
    const tokenHash = this.hashToken(token);

    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!resetToken) {
      return { valid: false };
    }

    return { valid: true, userId: resetToken.userId };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const verification = await this.verifyResetToken(token);

    if (!verification.valid || !verification.userId) {
      throw new Error('Token invalido o expirado');
    }

    if (newPassword.length < 8) {
      throw new Error('La contrasena debe tener al menos 8 caracteres');
    }

    const tokenHash = this.hashToken(token);
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: verification.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.updateMany({
        where: { tokenHash },
        data: { used: true },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: verification.userId },
        data: { revoked: true },
      }),
    ]);

    return { success: true, message: 'Contrasena actualizada exitosamente' };
  }

  private async generateAccessToken(userId: string): Promise<string> {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        sub: userId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 15 * 60,
      })
    ).toString('base64url');

    const signature = crypto
      .createHmac('sha256', config.jwtSecret)
      .update(header + '.' + payload)
      .digest('base64url');

    return header + '.' + payload + '.' + signature;
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);

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

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  verifyAccessToken(token: string): { userId: string } | null {
    try {
      const [header, payload, signature] = token.split('.');

      const expectedSignature = crypto
        .createHmac('sha256', config.jwtSecret)
        .update(header + '.' + payload)
        .digest('base64url');

      if (signature !== expectedSignature) {
        return null;
      }

      const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());

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
