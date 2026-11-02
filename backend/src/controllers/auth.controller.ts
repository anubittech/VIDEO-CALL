import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import {
  validateLoginInput,
  validateRegistrationInput,
} from '../utils/validation';
import { AUTH_COOKIE_NAME, getAuthCookieOptions } from '../utils/jwt';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';

export class AuthController {
  static async register(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validation = validateRegistrationInput(req.body);
      if (!validation.valid) {
        throw new AppError(validation.error || 'Invalid registration data.', 400);
      }

      const { name, email, password } = req.body;
      const { user, token } = await AuthService.registerUser(name, email, password);

      res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

      res.status(201).json({
        success: true,
        message: 'Account created successfully.',
        data: {
          user,
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validation = validateLoginInput(req.body);
      if (!validation.valid) {
        throw new AppError(validation.error || 'Invalid login credentials.', 400);
      }

      const { email, password } = req.body;
      const { user, token } = await AuthService.loginUser(email, password);

      res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

      res.status(200).json({
        success: true,
        message: 'Logged in successfully.',
        data: {
          user,
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
      res.status(200).json({
        success: true,
        message: 'Logged out successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMe(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401);
      }

      const user = await AuthService.getUserById(req.user.userId);
      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }
}

