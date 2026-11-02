'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import {
  connectSignalingSocket,
  disconnectSignalingSocket,
} from '../lib/socket';
import { MediaState, RemotePeer, RoomParticipant } from '../lib/types';

/**
 * Public Google STUN servers for NAT traversal during development.
 * Note: For production deployment across symmetric NATs or strict enterprise firewalls,
 * a TURN server (e.g. coturn, Twilio Network Traversal, or Metered TURN) should be added
 * to the iceServers array with credentialed relay URLs.
 */
const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export type SignalingStatus =
  | 'initializing'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error';

interface UseWebRTCOptions {
  meetingId: string;
  enabled: boolean;
  userName?: string;
}

/**
 * Creates a live MediaStream (Canvas video track + WebAudio track) ONLY when
 * physical camera hardware is missing (NotFoundError) or locked by another browser
 * process on the same machine (NotReadableError). Never used if the user denies permission.
 */
const createHardwareFallbackStream = (
  labelName: string,
  includeVideo: boolean,
  includeAudio: boolean
): { stream: MediaStream; cleanup: () => void } => {
  const tracks: MediaStreamTrack[] = [];
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let audioCtx: AudioContext | null = null;

  if (includeVideo && typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');

    let frame = 0;
    const drawFrame = () => {
      if (!ctx) return;
      frame++;
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.5, '#1e1b4b');
      grad.addColorStop(1, '#090d16');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Animated subtle pulse ring
      const radius = 58 + Math.sin(frame * 0.08) * 6;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2 - 15, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.45)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Avatar circle
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2 - 15, 48, 0, Math.PI * 2);
      ctx.fillStyle = '#4f46e5';
      ctx.fill();

      // Initials
      const initials = (labelName || 'User')
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initials, canvas.width / 2, canvas.height / 2 - 15);

      // Live timestamp indicator proving real-time WebRTC video frame transmission
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 14px Inter, system-ui, sans-serif';
      ctx.fillText(
        `${labelName || 'Participant'} • Live WebRTC Stream (${new Date().toLocaleTimeString()})`,
        canvas.width / 2,
        canvas.height - 42
      );
    };

    drawFrame();
    intervalId = setInterval(drawFrame, 100);
    const canvasStream = canvas.captureStream(24);
    const videoTrack = canvasStream.getVideoTracks()[0];
    if (videoTrack) {
      tracks.push(videoTrack);
    }
  }

  if (includeAudio && typeof window !== 'undefined') {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
        const dest = audioCtx.createMediaStreamDestination();
        const oscillator = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        gain.gain.value = 0.0001; // Virtually silent carrier so audio track is active
        oscillator.connect(gain);
        gain.connect(dest);
        oscillator.start();
        const audioTrack = dest.stream.getAudioTracks()[0];
        if (audioTrack) {
          tracks.push(audioTrack);
        }
      }
    } catch {
      // Ignore AudioContext fallback errors
    }
  }

  const cleanup = () => {
    if (intervalId) clearInterval(intervalId);
    if (audioCtx && audioCtx.state !== 'closed') {
      audioCtx.close().catch(() => {});
    }
  };

  return { stream: new MediaStream(tracks), cleanup };
};

export const useWebRTC = ({
  meetingId,
  enabled,
  userName = 'Participant',
}: UseWebRTCOptions) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [remotePeers, setRemotePeers] = useState<Map<string, RemotePeer>>(
    new Map()
  );
  const [selfParticipant, setSelfParticipant] =
    useState<RoomParticipant | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isVideoOff, setIsVideoOff] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [signalingStatus, setSignalingStatus] =
    useState<SignalingStatus>('initializing');
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const fallbackCleanupRef = useRef<(() => void) | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const participantsRef = useRef<Map<string, RoomParticipant>>(new Map());
  const iceCandidateQueueRef = useRef<Map<string, RTCIceCandidateInit[]>>(
    new Map()
  );
  const mediaStateRef = useRef<MediaState>({
    isAudioMuted: false,
    isVideoOff: false,
    isScreenSharing: false,
  });

  const syncRemotePeersState = useCallback(() => {
    setRemotePeers((prev) => {
      const nextMap = new Map<string, RemotePeer>();
      participantsRef.current.forEach((participant, socketId) => {
        const pc = peerConnectionsRef.current.get(socketId);
        const existing = prev.get(socketId);
        nextMap.set(socketId, {
          participant,
          stream: existing?.stream || null,
          connectionState: pc?.connectionState || 'new',
        });
      });
      return nextMap;
    });
  }, []);

  const broadcastMediaState = useCallback((partial: Partial<MediaState>) => {
    mediaStateRef.current = {
      ...mediaStateRef.current,
      ...partial,
    };
    if (socketRef.current?.connected) {
      socketRef.current.emit('media-state-change', {
        mediaState: mediaStateRef.current,
      });
    }
  }, []);

  /**
   * Flushes any ICE candidates that arrived before remoteDescription was set
   */
  const flushIceQueue = useCallback(
    async (socketId: string, pc: RTCPeerConnection) => {
      const queue = iceCandidateQueueRef.current.get(socketId) || [];
      if (queue.length === 0) return;

      iceCandidateQueueRef.current.set(socketId, []);
      for (const candidateInit of queue) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidateInit));
        } catch (err) {
          console.warn('[WebRTC]: Failed to add queued ICE candidate:', err);
        }
      }
    },
    []
  );

  /**
   * Creates or retrieves an RTCPeerConnection for a remote socketId
   */
  const getOrCreatePeerConnection = useCallback(
    (remoteSocketId: string, participant: RoomParticipant): RTCPeerConnection => {
      participantsRef.current.set(remoteSocketId, participant);

      const existingPc = peerConnectionsRef.current.get(remoteSocketId);
      if (existingPc && existingPc.connectionState !== 'closed') {
        return existingPc;
      }

      const pc = new RTCPeerConnection(RTC_CONFIGURATION);
      peerConnectionsRef.current.set(remoteSocketId, pc);

      // Attach local audio & video tracks (prefer active screen share video track if sharing)
      const camStream = localStreamRef.current;
      const scrStream = screenStreamRef.current;

      const audioTrack = camStream?.getAudioTracks()[0] || null;
      const videoTrack =
        (scrStream?.getVideoTracks()[0] ?? camStream?.getVideoTracks()[0]) ||
        null;

      const outboundStream = camStream || scrStream || new MediaStream();

      if (audioTrack) {
        pc.addTrack(audioTrack, outboundStream);
      } else {
        pc.addTransceiver('audio', { direction: 'recvonly' });
      }

      if (videoTrack) {
        pc.addTrack(videoTrack, outboundStream);
      } else {
        pc.addTransceiver('video', { direction: 'recvonly' });
      }

      // Relay local ICE candidates to remote peer via Socket.IO
      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current?.connected) {
          socketRef.current.emit('webrtc-ice-candidate', {
            targetSocketId: remoteSocketId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      // Handle incoming remote media tracks
      pc.ontrack = (event) => {
        setRemotePeers((prev) => {
          const next = new Map(prev);
          const current = next.get(remoteSocketId);
          const currentParticipant =
            participantsRef.current.get(remoteSocketId) || participant;

          let targetStream = event.streams?.[0] || current?.stream || null;
          if (!targetStream) {
            targetStream = new MediaStream();
          }
          if (
            event.track &&
            !targetStream.getTracks().some((t) => t.id === event.track.id)
          ) {
            targetStream.addTrack(event.track);
          }

          next.set(remoteSocketId, {
            participant: currentParticipant,
            stream: targetStream,
            connectionState: pc.connectionState,
          });
          return next;
        });
      };

      pc.onconnectionstatechange = () => {
        setRemotePeers((prev) => {
          const next = new Map(prev);
          const current = next.get(remoteSocketId);
          const currentParticipant =
            participantsRef.current.get(remoteSocketId) || participant;
          next.set(remoteSocketId, {
            participant: currentParticipant,
            stream: current?.stream || null,
            connectionState: pc.connectionState,
          });
          return next;
        });
      };

      // Initialize remotePeers map entry immediately so participant tile renders right away
      setRemotePeers((prev) => {
        const next = new Map(prev);
        const existing = next.get(remoteSocketId);
        next.set(remoteSocketId, {
          participant,
          stream: existing?.stream || null,
          connectionState: pc.connectionState,
        });
        return next;
      });

      return pc;
    },
    []
  );

  /**
   * Cleans up a single peer connection when a remote participant leaves
   */
  const removePeerConnection = useCallback((remoteSocketId: string) => {
    const pc = peerConnectionsRef.current.get(remoteSocketId);
    if (pc) {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.close();
      peerConnectionsRef.current.delete(remoteSocketId);
    }

    participantsRef.current.delete(remoteSocketId);
    iceCandidateQueueRef.current.delete(remoteSocketId);

    setRemotePeers((prev) => {
      const next = new Map(prev);
      next.delete(remoteSocketId);
      return next;
    });
  }, []);

  /**
   * Acquires local camera and microphone via navigator.mediaDevices.getUserMedia()
   * with graceful fallback if permissions are denied or hardware is unavailable/locked.
   */
  const acquireLocalMedia = useCallback(async (): Promise<MediaStream | null> => {
    if (
      typeof window === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      const { stream: fallbackStream, cleanup } = createHardwareFallbackStream(
        userName,
        true,
        true
      );
      fallbackCleanupRef.current = cleanup;
      localStreamRef.current = fallbackStream;
      setLocalStream(fallbackStream);
      setIsAudioMuted(false);
      setIsVideoOff(false);
      mediaStateRef.current = {
        ...mediaStateRef.current,
        isAudioMuted: false,
        isVideoOff: false,
      };
      const httpsHint =
        typeof window !== 'undefined' && window.location.protocol === 'http:'
          ? ` Open https://${window.location.hostname}:3443 on mobile to enable physical camera & microphone.`
          : '';
      setMediaError(
        `Browser restricted camera/mic on insecure HTTP origin — joined with live fallback stream.${httpsHint}`
      );
      return fallbackStream;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setMediaError(null);
      setIsAudioMuted(false);
      setIsVideoOff(false);
      mediaStateRef.current = {
        ...mediaStateRef.current,
        isAudioMuted: false,
        isVideoOff: false,
      };
      return stream;
    } catch (firstErr: unknown) {
      const errName =
        firstErr instanceof DOMException ? firstErr.name : 'MediaError';

      // Explicitly respect user permission denial
      if (
        errName === 'NotAllowedError' ||
        errName === 'PermissionDeniedError'
      ) {
        setMediaError(
          'Camera and microphone permissions were denied. Please allow access in your browser address bar to share audio/video.'
        );
        setIsAudioMuted(true);
        setIsVideoOff(true);
        mediaStateRef.current = {
          ...mediaStateRef.current,
          isAudioMuted: true,
          isVideoOff: true,
        };
        return null;
      }

      // Try audio-only if camera hardware is busy or missing
      try {
        const audioOnlyStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        });
        // Supplement missing/locked video hardware with live canvas stream so 2-session testing on 1 PC streams video
        const { stream: fallbackVideo, cleanup } = createHardwareFallbackStream(
          userName,
          true,
          false
        );
        fallbackCleanupRef.current = cleanup;
        const vTrack = fallbackVideo.getVideoTracks()[0];
        if (vTrack) {
          audioOnlyStream.addTrack(vTrack);
        }
        localStreamRef.current = audioOnlyStream;
        setLocalStream(audioOnlyStream);
        setIsAudioMuted(false);
        setIsVideoOff(false);
        mediaStateRef.current = {
          ...mediaStateRef.current,
          isAudioMuted: false,
          isVideoOff: false,
        };
        setMediaError(
          'Camera device is busy or unavailable — using microphone with live fallback video stream.'
        );
        return audioOnlyStream;
      } catch {
        // Neither physical camera nor physical mic available on host machine
        const { stream: fallbackStream, cleanup } =
          createHardwareFallbackStream(userName, true, true);
        fallbackCleanupRef.current = cleanup;
        localStreamRef.current = fallbackStream;
        setLocalStream(fallbackStream);
        setIsAudioMuted(false);
        setIsVideoOff(false);
        mediaStateRef.current = {
          ...mediaStateRef.current,
          isAudioMuted: false,
          isVideoOff: false,
        };
        setMediaError(
          'No physical camera/microphone detected on this system — active WebRTC fallback stream enabled.'
        );
        return fallbackStream;
      }
    }
  }, [userName]);

  /**
   * Replaces or attaches a video track across all active RTCPeerConnection instances
   * and renegotiates if a new track had to be added.
   */
  const replaceVideoTrackOnPeers = useCallback(
    async (
      newVideoTrack: MediaStreamTrack | null,
      streamForTrack?: MediaStream
    ) => {
      const entries = Array.from(peerConnectionsRef.current.entries());
      for (const [remoteSocketId, pc] of entries) {
        try {
          if (pc.connectionState === 'closed') continue;

          let videoSender = pc
            .getSenders()
            .find((sender) => sender.track?.kind === 'video');

          if (!videoSender) {
            const videoTransceiver = pc
              .getTransceivers()
              .find(
                (t) =>
                  t.receiver.track?.kind === 'video' ||
                  t.sender.track?.kind === 'video'
              );
            if (videoTransceiver) {
              videoSender = videoTransceiver.sender;
              if (
                newVideoTrack &&
                videoTransceiver.direction === 'recvonly'
              ) {
                videoTransceiver.direction = 'sendrecv';
              }
            }
          }

          if (videoSender) {
            await videoSender.replaceTrack(newVideoTrack);
          } else if (newVideoTrack && streamForTrack) {
            pc.addTrack(newVideoTrack, streamForTrack);
            if (pc.signalingState === 'stable') {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socketRef.current?.emit('webrtc-offer', {
                targetSocketId: remoteSocketId,
                offer,
              });
            }
          }
        } catch (err) {
          console.error(
            `[WebRTC]: Failed to replace video track for peer ${remoteSocketId}:`,
            err
          );
        }
      }
    },
    []
  );

  /**
   * Stops screen sharing and restores camera video track
   */
  const stopScreenShare = useCallback(async () => {
    const activeScreenStream = screenStreamRef.current;
    if (activeScreenStream) {
      activeScreenStream.getTracks().forEach((track) => {
        track.onended = null;
        track.stop();
      });
      screenStreamRef.current = null;
      setScreenStream(null);
    }

    setIsScreenSharing(false);

    const camVideoTrack =
      localStreamRef.current?.getVideoTracks()[0] || null;
    if (camVideoTrack) {
      camVideoTrack.enabled = !mediaStateRef.current.isVideoOff;
    }

    await replaceVideoTrackOnPeers(
      camVideoTrack,
      localStreamRef.current || undefined
    );

    broadcastMediaState({ isScreenSharing: false });
  }, [broadcastMediaState, replaceVideoTrackOnPeers]);

  /**
   * Starts real screen sharing via navigator.mediaDevices.getDisplayMedia()
   */
  const startScreenShare = useCallback(async () => {
    if (
      typeof window === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getDisplayMedia
    ) {
      setMediaError(
        'Screen sharing (getDisplayMedia) is not supported in this browser.'
      );
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });

      const screenVideoTrack = displayStream.getVideoTracks()[0];
      if (!screenVideoTrack) {
        return;
      }

      // Handle browser-native "Stop sharing" bar termination
      screenVideoTrack.onended = () => {
        stopScreenShare();
      };

      screenStreamRef.current = displayStream;
      setScreenStream(displayStream);
      setIsScreenSharing(true);

      await replaceVideoTrackOnPeers(screenVideoTrack, displayStream);
      broadcastMediaState({ isScreenSharing: true });
    } catch (err: unknown) {
      const errName = err instanceof DOMException ? err.name : '';
      if (errName !== 'NotAllowedError' && errName !== 'AbortError') {
        setMediaError('Failed to start screen sharing. Please try again.');
      }
    }
  }, [broadcastMediaState, replaceVideoTrackOnPeers, stopScreenShare]);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      await stopScreenShare();
    } else {
      await startScreenShare();
    }
  }, [isScreenSharing, startScreenShare, stopScreenShare]);

  /**
   * Toggles microphone mute/unmute
   */
  const toggleAudio = useCallback(async () => {
    const stream = localStreamRef.current;
    const audioTrack = stream?.getAudioTracks()[0];

    if (audioTrack) {
      const nextMuted = audioTrack.enabled;
      audioTrack.enabled = !nextMuted;
      setIsAudioMuted(nextMuted);
      broadcastMediaState({ isAudioMuted: nextMuted });
      return;
    }

    try {
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      const newAudioTrack = micStream.getAudioTracks()[0];
      if (newAudioTrack) {
        if (!localStreamRef.current) {
          localStreamRef.current = micStream;
          setLocalStream(micStream);
        } else {
          localStreamRef.current.addTrack(newAudioTrack);
        }

        peerConnectionsRef.current.forEach((pc) => {
          const audioSender = pc
            .getSenders()
            .find((s) => s.track?.kind === 'audio');
          if (audioSender) {
            audioSender.replaceTrack(newAudioTrack);
          } else if (localStreamRef.current) {
            pc.addTrack(newAudioTrack, localStreamRef.current);
          }
        });

        setIsAudioMuted(false);
        setMediaError(null);
        broadcastMediaState({ isAudioMuted: false });
      }
    } catch {
      setMediaError(
        'Unable to access microphone. Please check your browser permissions.'
      );
    }
  }, [broadcastMediaState]);

  /**
   * Toggles camera on/off
   */
  const toggleVideo = useCallback(async () => {
    const stream = localStreamRef.current;
    const videoTrack = stream?.getVideoTracks()[0];

    if (videoTrack) {
      const nextVideoOff = videoTrack.enabled;
      videoTrack.enabled = !nextVideoOff;
      setIsVideoOff(nextVideoOff);
      broadcastMediaState({ isVideoOff: nextVideoOff });
      return;
    }

    try {
      const camStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      const newVideoTrack = camStream.getVideoTracks()[0];
      if (newVideoTrack) {
        if (!localStreamRef.current) {
          localStreamRef.current = camStream;
          setLocalStream(camStream);
        } else {
          localStreamRef.current.addTrack(newVideoTrack);
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        }

        if (!screenStreamRef.current) {
          await replaceVideoTrackOnPeers(newVideoTrack, localStreamRef.current);
        }

        setIsVideoOff(false);
        setMediaError(null);
        broadcastMediaState({ isVideoOff: false });
      }
    } catch {
      setMediaError(
        'Unable to access camera. Please check your browser permissions.'
      );
    }
  }, [broadcastMediaState, replaceVideoTrackOnPeers]);

  /**
   * Safely cleans up all local media tracks, peer connections, and socket room membership
   */
  const cleanupAndLeave = useCallback(() => {
    if (fallbackCleanupRef.current) {
      fallbackCleanupRef.current();
      fallbackCleanupRef.current = null;
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => {
        track.onended = null;
        track.stop();
      });
      screenStreamRef.current = null;
      setScreenStream(null);
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }

    peerConnectionsRef.current.forEach((pc) => {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.close();
    });
    peerConnectionsRef.current.clear();
    participantsRef.current.clear();
    iceCandidateQueueRef.current.clear();
    setRemotePeers(new Map());

    if (socketRef.current) {
      socketRef.current.emit('leave-room');
      disconnectSignalingSocket();
      socketRef.current = null;
    }

    setSignalingStatus('disconnected');
  }, []);

  useEffect(() => {
    if (!enabled || !meetingId) return;

    let isMounted = true;

    const setupMeetingSession = async () => {
      setSignalingStatus('initializing');
      await acquireLocalMedia();

      if (!isMounted) return;

      setSignalingStatus('connecting');
      const socket = connectSignalingSocket();
      socketRef.current = socket;

      const joinCurrentRoom = () => {
        if (!isMounted) return;
        setSignalingStatus('connected');
        socket.emit(
          'join-room',
          {
            meetingId,
            mediaState: mediaStateRef.current,
          },
          (response: {
            success: boolean;
            error?: string;
            participants?: RoomParticipant[];
          }) => {
            if (!isMounted) return;
            if (!response?.success) {
              setRoomError(
                response?.error || 'Failed to join meeting signaling room.'
              );
              setSignalingStatus('error');
            }
          }
        );
      };

      if (socket.connected) {
        joinCurrentRoom();
      } else {
        socket.on('connect', joinCurrentRoom);
      }

      socket.on('connect_error', (err) => {
        if (!isMounted) return;
        console.error('[Socket.IO Connect Error]:', err.message);
        setSignalingStatus('error');
        setRoomError(err.message || 'Signaling server connection error.');
      });

      socket.on('disconnect', () => {
        if (!isMounted) return;
        setSignalingStatus('reconnecting');
      });

      socket.on('room-error', (payload: { message: string }) => {
        if (!isMounted) return;
        setRoomError(payload.message);
        setSignalingStatus('error');
      });

      socket.on(
        'room-users',
        (payload: {
          meetingId: string;
          participants: RoomParticipant[];
          self: RoomParticipant;
        }) => {
          if (!isMounted) return;
          setSelfParticipant(payload.self);

          payload.participants.forEach((participant) => {
            participantsRef.current.set(participant.socketId, participant);
            getOrCreatePeerConnection(participant.socketId, participant);
          });
          syncRemotePeersState();
        }
      );

      socket.on(
        'user-joined',
        async (payload: { participant: RoomParticipant }) => {
          if (!isMounted) return;
          const { participant } = payload;
          const pc = getOrCreatePeerConnection(
            participant.socketId,
            participant
          );

          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            socket.emit('webrtc-offer', {
              targetSocketId: participant.socketId,
              offer: pc.localDescription,
            });
          } catch (err) {
            console.error('[WebRTC]: Error creating offer:', err);
          }
        }
      );

      socket.on(
        'webrtc-offer',
        async (payload: {
          senderSocketId: string;
          senderParticipant: RoomParticipant;
          offer: RTCSessionDescriptionInit;
        }) => {
          if (!isMounted) return;
          const { senderSocketId, senderParticipant, offer } = payload;
          const pc = getOrCreatePeerConnection(
            senderSocketId,
            senderParticipant
          );

          try {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            await flushIceQueue(senderSocketId, pc);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit('webrtc-answer', {
              targetSocketId: senderSocketId,
              answer: pc.localDescription,
            });
          } catch (err) {
            console.error('[WebRTC]: Error handling incoming offer:', err);
          }
        }
      );

      socket.on(
        'webrtc-answer',
        async (payload: {
          senderSocketId: string;
          answer: RTCSessionDescriptionInit;
        }) => {
          if (!isMounted) return;
          const { senderSocketId, answer } = payload;
          const pc = peerConnectionsRef.current.get(senderSocketId);
          if (!pc) return;

          try {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            await flushIceQueue(senderSocketId, pc);
          } catch (err) {
            console.error('[WebRTC]: Error setting remote answer:', err);
          }
        }
      );

      socket.on(
        'webrtc-ice-candidate',
        async (payload: {
          senderSocketId: string;
          candidate: RTCIceCandidateInit;
        }) => {
          if (!isMounted) return;
          const { senderSocketId, candidate } = payload;
          if (!candidate) return;

          const pc = peerConnectionsRef.current.get(senderSocketId);
          if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              console.warn('[WebRTC]: Error adding ICE candidate:', err);
            }
          } else {
            const queue = iceCandidateQueueRef.current.get(senderSocketId) || [];
            queue.push(candidate);
            iceCandidateQueueRef.current.set(senderSocketId, queue);
          }
        }
      );

      socket.on(
        'user-media-state-changed',
        (payload: {
          socketId: string;
          userId: string;
          mediaState: MediaState;
        }) => {
          if (!isMounted) return;
          const existing = participantsRef.current.get(payload.socketId);
          if (existing) {
            const updated: RoomParticipant = {
              ...existing,
              mediaState: payload.mediaState,
            };
            participantsRef.current.set(payload.socketId, updated);

            setRemotePeers((prev) => {
              const next = new Map(prev);
              const currentPeer = next.get(payload.socketId);
              if (currentPeer) {
                next.set(payload.socketId, {
                  ...currentPeer,
                  participant: updated,
                });
              }
              return next;
            });
          }
        }
      );

      socket.on(
        'user-left',
        (payload: { socketId: string; userId: string; name: string }) => {
          if (!isMounted) return;
          removePeerConnection(payload.socketId);
        }
      );
    };

    setupMeetingSession();

    return () => {
      isMounted = false;
      cleanupAndLeave();
    };
  }, [
    enabled,
    meetingId,
    acquireLocalMedia,
    getOrCreatePeerConnection,
    flushIceQueue,
    removePeerConnection,
    cleanupAndLeave,
    syncRemotePeersState,
  ]);

  return {
    localStream,
    screenStream,
    remotePeers: Array.from(remotePeers.values()),
    selfParticipant,
    isAudioMuted,
    isVideoOff,
    isScreenSharing,
    signalingStatus,
    mediaError,
    roomError,
    dismissMediaError: () => setMediaError(null),
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    stopScreenShare,
    leaveRoom: cleanupAndLeave,
  };
};
