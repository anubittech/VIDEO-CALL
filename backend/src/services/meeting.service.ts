import { prisma } from '../utils/prisma';
import {
  generateMeetingId,
  isValidMeetingIdFormat,
  normalizeMeetingId,
} from '../utils/meetingId';
import { AppError } from '../middleware/error.middleware';

export class MeetingService {
  static async createMeeting(hostId: string, hostName: string, rawTitle?: string) {
    const title =
      rawTitle && typeof rawTitle === 'string' && rawTitle.trim().length > 0
        ? rawTitle.trim().slice(0, 100)
        : `${hostName}'s Video Meeting`;

    let meetingId = generateMeetingId();
    let attempts = 0;

    while (attempts < 5) {
      const collision = await prisma.meeting.findUnique({
        where: { meetingId },
      });
      if (!collision) break;
      meetingId = generateMeetingId();
      attempts++;
    }

    const meeting = await prisma.meeting.create({
      data: {
        meetingId,
        title,
        hostId,
        status: 'ACTIVE',
      },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return meeting;
  }

  static async getMeetingByCode(rawCode: string) {
    const meetingId = normalizeMeetingId(rawCode);

    if (!meetingId || !isValidMeetingIdFormat(meetingId)) {
      throw new AppError(
        'Invalid meeting ID format. Expected format like xxxx-xxxx-xxxx.',
        400
      );
    }

    const meeting = await prisma.meeting.findUnique({
      where: { meetingId },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!meeting) {
      throw new AppError(
        'Meeting not found. Please check the meeting ID or invitation link.',
        404
      );
    }

    if (meeting.status === 'ENDED') {
      throw new AppError('This meeting has already ended.', 410);
    }

    return meeting;
  }

  static async getUserMeetings(userId: string) {
    const meetings = await prisma.meeting.findMany({
      where: { hostId: userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        host: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return meetings;
  }

  static async endMeeting(rawCode: string, userId: string) {
    const meetingId = normalizeMeetingId(rawCode);
    const meeting = await prisma.meeting.findUnique({
      where: { meetingId },
    });

    if (!meeting) {
      throw new AppError('Meeting not found.', 404);
    }

    if (meeting.hostId !== userId) {
      throw new AppError('Only the meeting host can end this meeting.', 403);
    }

    return prisma.meeting.update({
      where: { meetingId },
      data: { status: 'ENDED' },
    });
  }
}

