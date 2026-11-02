import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { AUTH_COOKIE_NAME, JwtPayload, verifyToken } from '../utils/jwt';
import { MeetingService } from '../services/meeting.service';
import { normalizeMeetingId } from '../utils/meetingId';

export interface MediaState {
  isAudioMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
}

export interface SessionDescriptionPayload {
  type: 'offer' | 'answer' | 'pranswer' | 'rollback';
  sdp?: string;
}

export interface IceCandidatePayload {
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}

export interface RoomParticipant {
  socketId: string;
  userId: string;
  name: string;
  email: string;
  isHost: boolean;
  joinedAt: string;
  mediaState: MediaState;
}

interface AuthenticatedSocket extends Socket {
  user?: JwtPayload;
  currentMeetingId?: string;
}

const rooms = new Map<string, Map<string, RoomParticipant>>();

const parseCookieToken = (cookieHeader?: string): string | null => {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [rawName, ...rest] = cookie.trim().split('=');
    if (rawName === AUTH_COOKIE_NAME) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
};

export const initializeSignalingServer = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: true,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Socket Authentication Middleware
  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const authToken =
        socket.handshake.auth?.token ||
        parseCookieToken(socket.handshake.headers.cookie);

      if (!authToken) {
        return next(new Error('Authentication required for signaling connection.'));
      }

      const decoded = verifyToken(authToken);
      socket.user = decoded;
      next();
    } catch (_err) {
      next(new Error('Invalid or expired authentication token.'));
    }
  });

  const handleLeaveRoom = (socket: AuthenticatedSocket) => {
    const meetingId = socket.currentMeetingId;
    if (!meetingId) return;

    const roomParticipants = rooms.get(meetingId);
    if (roomParticipants) {
      const leavingParticipant = roomParticipants.get(socket.id);
      roomParticipants.delete(socket.id);

      if (leavingParticipant) {
        socket.to(meetingId).emit('user-left', {
          socketId: socket.id,
          userId: leavingParticipant.userId,
          name: leavingParticipant.name,
        });
      }

      if (roomParticipants.size === 0) {
        rooms.delete(meetingId);
      }
    }

    socket.leave(meetingId);
    socket.currentMeetingId = undefined;
  };

  io.on('connection', (socket: AuthenticatedSocket) => {
    // 1. Join a Meeting Room
    socket.on(
      'join-room',
      async (
        payload: {
          meetingId: string;
          mediaState?: Partial<MediaState>;
        },
        callback?: (response: {
          success: boolean;
          error?: string;
          participants?: RoomParticipant[];
        }) => void
      ) => {
        try {
          if (!socket.user) {
            callback?.({ success: false, error: 'Unauthorized user.' });
            return;
          }

          const meetingId = normalizeMeetingId(payload?.meetingId);
          const meeting = await MeetingService.getMeetingByCode(meetingId);

          // Leave previous room if any
          if (socket.currentMeetingId && socket.currentMeetingId !== meetingId) {
            handleLeaveRoom(socket);
          }

          if (!rooms.has(meetingId)) {
            rooms.set(meetingId, new Map<string, RoomParticipant>());
          }

          const roomParticipants = rooms.get(meetingId)!;
          const existingParticipants = Array.from(roomParticipants.values()).filter(
            (p) => p.socketId !== socket.id
          );

          const participant: RoomParticipant = {
            socketId: socket.id,
            userId: socket.user.userId,
            name: socket.user.name,
            email: socket.user.email,
            isHost: meeting.hostId === socket.user.userId,
            joinedAt: new Date().toISOString(),
            mediaState: {
              isAudioMuted: payload?.mediaState?.isAudioMuted ?? false,
              isVideoOff: payload?.mediaState?.isVideoOff ?? false,
              isScreenSharing: payload?.mediaState?.isScreenSharing ?? false,
            },
          };

          roomParticipants.set(socket.id, participant);
          socket.currentMeetingId = meetingId;
          socket.join(meetingId);

          // Send existing room participants to the joining client
          socket.emit('room-users', {
            meetingId,
            participants: existingParticipants,
            self: participant,
          });

          // Notify all existing participants in the room that a new user joined
          socket.to(meetingId).emit('user-joined', {
            participant,
          });

          callback?.({
            success: true,
            participants: existingParticipants,
          });
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : 'Unable to join meeting room.';
          socket.emit('room-error', { message });
          callback?.({ success: false, error: message });
        }
      }
    );

    // 2. WebRTC Offer Exchange
    socket.on(
      'webrtc-offer',
      (payload: {
        targetSocketId: string;
        offer: SessionDescriptionPayload;
      }) => {
        const meetingId = socket.currentMeetingId;
        if (!meetingId || !payload?.targetSocketId || !payload?.offer) return;

        const roomParticipants = rooms.get(meetingId);
        const sender = roomParticipants?.get(socket.id);
        if (!sender) return;

        io.to(payload.targetSocketId).emit('webrtc-offer', {
          senderSocketId: socket.id,
          senderParticipant: sender,
          offer: payload.offer,
        });
      }
    );

    // 3. WebRTC Answer Exchange
    socket.on(
      'webrtc-answer',
      (payload: {
        targetSocketId: string;
        answer: SessionDescriptionPayload;
      }) => {
        const meetingId = socket.currentMeetingId;
        if (!meetingId || !payload?.targetSocketId || !payload?.answer) return;

        io.to(payload.targetSocketId).emit('webrtc-answer', {
          senderSocketId: socket.id,
          answer: payload.answer,
        });
      }
    );

    // 4. WebRTC ICE Candidate Exchange
    socket.on(
      'webrtc-ice-candidate',
      (payload: {
        targetSocketId: string;
        candidate: IceCandidatePayload;
      }) => {
        const meetingId = socket.currentMeetingId;
        if (!meetingId || !payload?.targetSocketId || !payload?.candidate) return;

        io.to(payload.targetSocketId).emit('webrtc-ice-candidate', {
          senderSocketId: socket.id,
          candidate: payload.candidate,
        });
      }
    );

    // 5. Media State Changes (Mic Mute, Camera Toggle, Screen Sharing)
    socket.on(
      'media-state-change',
      (payload: { mediaState: Partial<MediaState> }) => {
        const meetingId = socket.currentMeetingId;
        if (!meetingId || !payload?.mediaState) return;

        const roomParticipants = rooms.get(meetingId);
        const participant = roomParticipants?.get(socket.id);
        if (!participant) return;

        participant.mediaState = {
          ...participant.mediaState,
          ...payload.mediaState,
        };

        roomParticipants?.set(socket.id, participant);

        io.to(meetingId).emit('user-media-state-changed', {
          socketId: socket.id,
          userId: participant.userId,
          mediaState: participant.mediaState,
        });
      }
    );

    // 6. Leave Room Event
    socket.on('leave-room', () => {
      handleLeaveRoom(socket);
    });

    // 7. Disconnect Event
    socket.on('disconnect', () => {
      handleLeaveRoom(socket);
    });
  });

  return io;
};
