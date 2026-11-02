import { Request, Response, NextFunction } from 'express';
import { AUTH_COOKIE_NAME, JwtPayload, verifyToken } from '../utils/jwt';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    let token: string | undefined = req.cookies?.[AUTH_COOKIE_NAME];

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in to continue.',
      });
      return;
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
    res.status(401).json({
      success: false,
      message: 'Your session has expired or is invalid. Please log in again.',
    });
  }
};

