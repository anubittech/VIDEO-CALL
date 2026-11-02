import bcrypt from 'bcrypt';
import { prisma } from '../utils/prisma';
import { signToken } from '../utils/jwt';
import { AppError } from '../middleware/error.middleware';

const SALT_ROUNDS = 10;

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export class AuthService {
  static async registerUser(name: string, email: string, password: string): Promise<{
    user: SafeUser;
    token: string;
  }> {
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new AppError('An account with this email address already exists.', 409);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        name: trimmedName,
        email: normalizedEmail,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    return { user, token };
  }

  static async loginUser(email: string, password: string): Promise<{
    user: SafeUser;
    token: string;
  }> {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new AppError('Invalid email or password.', 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password.', 401);
    }

    const safeUser: SafeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };

    const token = signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    return { user: safeUser, token };
  }

  static async getUserById(userId: string): Promise<SafeUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError('User account not found.', 404);
    }

    return user;
  }
}

