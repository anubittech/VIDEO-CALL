import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { MeetingService } from '../services/meeting.service';
import { AppError } from '../middleware/error.middleware';

export class MeetingController {
  static async createMeeting(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401);
      }

      const { title } = req.body;
      const meeting = await MeetingService.createMeeting(
        req.user.userId,
        req.user.name,
        title
      );

      const clientUrl =
        req.headers.origin || process.env.CLIENT_URL || 'http://192.168.20.12:3000';
      const inviteLink = `${clientUrl}/meeting/${meeting.meetingId}`;

      res.status(201).json({
        success: true,
        message: 'Meeting created successfully.',
        data: {
          meeting: {
            ...meeting,
            inviteLink,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMeeting(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const rawParam = req.params.meetingId;
      const meetingId = Array.isArray(rawParam) ? rawParam[0] : rawParam;
      const meeting = await MeetingService.getMeetingByCode(meetingId);

      const clientUrl =
        req.headers.origin || process.env.CLIENT_URL || 'http://192.168.20.12:3000';
      const inviteLink = `${clientUrl}/meeting/${meeting.meetingId}`;

      res.status(200).json({
        success: true,
        data: {
          meeting: {
            ...meeting,
            inviteLink,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async joinMeeting(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const rawParam = req.params.meetingId || req.body?.meetingId;
      const rawCode = Array.isArray(rawParam) ? rawParam[0] : rawParam;
      const meeting = await MeetingService.getMeetingByCode(rawCode);

      const clientUrl =
        req.headers.origin || process.env.CLIENT_URL || 'http://192.168.20.12:3000';
      const inviteLink = `${clientUrl}/meeting/${meeting.meetingId}`;

      res.status(200).json({
        success: true,
        message: 'Meeting verified and ready to join.',
        data: {
          meeting: {
            ...meeting,
            inviteLink,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMyMeetings(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401);
      }

      const meetings = await MeetingService.getUserMeetings(req.user.userId);
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

      res.status(200).json({
        success: true,
        data: {
          meetings: meetings.map((m) => ({
            ...m,
            inviteLink: `${clientUrl}/meeting/${m.meetingId}`,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async endMeeting(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401);
      }

      const rawParam = req.params.meetingId;
      const meetingId = Array.isArray(rawParam) ? rawParam[0] : rawParam;
      const meeting = await MeetingService.endMeeting(meetingId, req.user.userId);

      res.status(200).json({
        success: true,
        message: 'Meeting ended.',
        data: { meeting },
      });
    } catch (error) {
      next(error);
    }
  }
}
