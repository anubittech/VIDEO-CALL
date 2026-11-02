'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Video,
  AlertTriangle,
  MonitorUp,
  ArrowLeft,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useWebRTC } from '@/hooks/useWebRTC';
import { meetingService } from '@/services/meetingService';
import { Meeting } from '@/lib/types';
import { VideoTile } from '@/components/meeting/VideoTile';
import { MeetingToolbar } from '@/components/meeting/MeetingToolbar';
import { ParticipantsPanel } from '@/components/meeting/ParticipantsPanel';
import styles from './meeting.module.css';

export default function MeetingRoomPage() {
  const params = useParams();
  const router = useRouter();
  const rawMeetingId = Array.isArray(params?.meetingId)
    ? params.meetingId[0]
    : params?.meetingId || '';
  const meetingId = rawMeetingId.toLowerCase();

  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [meetingDetails, setMeetingDetails] = useState<Meeting | null>(null);
  const [isValidatingRoom, setIsValidatingRoom] = useState<boolean>(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // 1. Redirect unauthenticated users to login with redirect back to this meeting
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace(
        `/login?redirect=${encodeURIComponent(`/meeting/${meetingId}`)}`
      );
    }
  }, [authLoading, isAuthenticated, router, meetingId]);

  // 2. Validate meeting room existence and status on backend
  useEffect(() => {
    if (authLoading || !isAuthenticated || !meetingId) return;

    let active = true;
    const verifyRoom = async () => {
      setIsValidatingRoom(true);
      setValidationError(null);
      try {
        const meeting = await meetingService.joinMeeting(meetingId);
        if (active) {
          setMeetingDetails(meeting);
        }
      } catch (err: unknown) {
        if (active) {
          setValidationError(
            err instanceof Error
              ? err.message
              : 'Meeting room is invalid or unavailable.'
          );
        }
      } finally {
        if (active) {
          setIsValidatingRoom(false);
        }
      }
    };

    verifyRoom();
    return () => {
      active = false;
    };
  }, [authLoading, isAuthenticated, meetingId]);

  // 3. Initialize WebRTC & Socket.IO Signaling once room is verified
  const isRoomReady = Boolean(
    !authLoading && isAuthenticated && meetingDetails && !validationError
  );

  const {
    localStream,
    screenStream,
    remotePeers,
    isAudioMuted,
    isVideoOff,
    isScreenSharing,
    signalingStatus,
    mediaError,
    roomError,
    dismissMediaError,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    stopScreenShare,
    leaveRoom,
  } = useWebRTC({
    meetingId,
    enabled: isRoomReady,
    userName: user?.name || 'Participant',
  });

  // 4. Meeting Duration Timer
  useEffect(() => {
    if (!isRoomReady) return;
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isRoomReady]);

  const formatDuration = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60)
      .toString()
      .padStart(2, '0');
    const secs = (totalSecs % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const handleLeaveMeeting = () => {
    leaveRoom();
    router.push('/dashboard');
  };

  if (authLoading || isValidatingRoom) {
    return (
      <div className={styles.stateScreen}>
        <div className={styles.stateCard}>
          <div className={styles.logoBox}>
            <Video size={22} />
          </div>
          <h1 className={styles.stateTitle}>Joining Meeting Room...</h1>
          <p className={styles.stateText}>
            Verifying room <strong>{meetingId}</strong> and preparing your
            WebRTC media channels.
          </p>
        </div>
      </div>
    );
  }

  if (validationError || roomError) {
    return (
      <div className={styles.stateScreen}>
        <div className={styles.stateCard}>
          <ShieldAlert size={42} color="#ef4444" />
          <h1 className={styles.stateTitle}>Unable to Join Meeting</h1>
          <p className={styles.stateText}>{validationError || roomError}</p>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className={styles.backBtn}
          >
            <ArrowLeft size={17} />
            <span>Return to Dashboard</span>
          </button>
        </div>
      </div>
    );
  }

  const isLocalHost = Boolean(
    user && meetingDetails && meetingDetails.hostId === user.id
  );
  const totalParticipants = 1 + remotePeers.length;

  // Determine if anyone (local or remote) is actively sharing their screen
  const remoteScreenSharer = remotePeers.find(
    (peer) => peer.participant.mediaState.isScreenSharing
  );
  const isPresentationMode = Boolean(isScreenSharing || remoteScreenSharer);

  const getGridClass = (count: number) => {
    if (count === 1) return styles.grid1;
    if (count === 2) return styles.grid2;
    if (count === 3) return styles.grid3;
    if (count === 4) return styles.grid4;
    return styles.gridMulti;
  };

  const statusLabel =
    signalingStatus === 'connected'
      ? 'Connected'
      : signalingStatus === 'connecting' || signalingStatus === 'initializing'
      ? 'Connecting...'
      : signalingStatus === 'reconnecting'
      ? 'Reconnecting...'
      : 'Disconnected';

  return (
    <div className={styles.roomContainer}>
      {/* Top Status Header */}
      <header className={styles.topBar}>
        <div className={styles.meetingInfo}>
          <div className={styles.logoBox}>
            <Video size={18} />
          </div>
          <span className={styles.meetingTitle}>
            {meetingDetails?.title || 'Video Meeting'}
          </span>
          <span className={styles.divider} />

          {isPresentationMode && (
            <div className={styles.screenBanner}>
              <MonitorUp size={15} />
              <span>
                {isScreenSharing
                  ? 'You are presenting your screen'
                  : `${remoteScreenSharer?.participant.name} is presenting`}
              </span>
              {isScreenSharing && (
                <button
                  type="button"
                  onClick={stopScreenShare}
                  className={styles.stopShareInlineBtn}
                >
                  Stop
                </button>
              )}
            </div>
          )}
        </div>

        <div className={styles.statusSection}>
          <div className={styles.connectionBadge}>
            <span
              className={`${styles.statusDot} ${
                signalingStatus === 'connected'
                  ? styles.dotConnected
                  : signalingStatus === 'error'
                  ? styles.dotError
                  : styles.dotConnecting
              }`}
            />
            <span>{statusLabel}</span>
          </div>

          <div className={styles.timerBadge}>
            {formatDuration(elapsedSeconds)}
          </div>
        </div>
      </header>

      {/* Media Warning Banner if applicable */}
      {mediaError && (
        <div className={styles.mediaAlertBar} role="status">
          <div className={styles.alertContent}>
            <AlertTriangle size={16} />
            <span>{mediaError}</span>
          </div>
          <button
            type="button"
            onClick={dismissMediaError}
            className={styles.dismissBtn}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workspace: Video Grid + Optional Participants Sidebar */}
      <div className={styles.workspace}>
        <main className={styles.stageArea}>
          {isPresentationMode ? (
            <div className={styles.presentationLayout}>
              {/* Spotlight Screen Share Stage */}
              <div className={styles.primaryScreenStage}>
                {isScreenSharing ? (
                  <VideoTile
                    stream={screenStream || localStream}
                    name={user?.name || 'You'}
                    isLocal={true}
                    isHost={isLocalHost}
                    isAudioMuted={isAudioMuted}
                    isVideoOff={false}
                    isScreenSharing={true}
                  />
                ) : (
                  remoteScreenSharer && (
                    <VideoTile
                      stream={remoteScreenSharer.stream}
                      name={remoteScreenSharer.participant.name}
                      isLocal={false}
                      isHost={remoteScreenSharer.participant.isHost}
                      isAudioMuted={
                        remoteScreenSharer.participant.mediaState.isAudioMuted
                      }
                      isVideoOff={false}
                      isScreenSharing={true}
                      connectionState={remoteScreenSharer.connectionState}
                    />
                  )
                )}
              </div>

              {/* Participant Filmstrip */}
              <div className={styles.filmstrip}>
                <div className={styles.filmstripTile}>
                  <VideoTile
                    stream={localStream}
                    name={user?.name || 'You'}
                    isLocal={true}
                    isHost={isLocalHost}
                    isAudioMuted={isAudioMuted}
                    isVideoOff={isVideoOff}
                    isScreenSharing={false}
                  />
                </div>

                {remotePeers.map((peer) => (
                  <div
                    key={peer.participant.socketId}
                    className={styles.filmstripTile}
                  >
                    <VideoTile
                      stream={peer.stream}
                      name={peer.participant.name}
                      isLocal={false}
                      isHost={peer.participant.isHost}
                      isAudioMuted={peer.participant.mediaState.isAudioMuted}
                      isVideoOff={peer.participant.mediaState.isVideoOff}
                      isScreenSharing={
                        peer.participant.mediaState.isScreenSharing
                      }
                      connectionState={peer.connectionState}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div
              className={`${styles.videoGrid} ${getGridClass(
                totalParticipants
              )}`}
            >
              {/* Local Participant Tile */}
              <VideoTile
                stream={localStream}
                name={user?.name || 'You'}
                isLocal={true}
                isHost={isLocalHost}
                isAudioMuted={isAudioMuted}
                isVideoOff={isVideoOff}
                isScreenSharing={isScreenSharing}
              />

              {/* Remote Participant Tiles */}
              {remotePeers.map((peer) => (
                <VideoTile
                  key={peer.participant.socketId}
                  stream={peer.stream}
                  name={peer.participant.name}
                  isLocal={false}
                  isHost={peer.participant.isHost}
                  isAudioMuted={peer.participant.mediaState.isAudioMuted}
                  isVideoOff={peer.participant.mediaState.isVideoOff}
                  isScreenSharing={peer.participant.mediaState.isScreenSharing}
                  connectionState={peer.connectionState}
                />
              ))}
            </div>
          )}
        </main>

        {isParticipantsOpen && (
          <ParticipantsPanel
            localName={user?.name || 'You'}
            isLocalHost={isLocalHost}
            isLocalAudioMuted={isAudioMuted}
            isLocalVideoOff={isVideoOff}
            isLocalScreenSharing={isScreenSharing}
            remoteParticipants={remotePeers.map((p) => p.participant)}
            onClose={() => setIsParticipantsOpen(false)}
          />
        )}
      </div>

      {/* Bottom Meeting Controls Toolbar */}
      <MeetingToolbar
        meetingId={meetingId}
        isAudioMuted={isAudioMuted}
        isVideoOff={isVideoOff}
        isScreenSharing={isScreenSharing}
        participantCount={totalParticipants}
        isParticipantsOpen={isParticipantsOpen}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={toggleScreenShare}
        onToggleParticipants={() => setIsParticipantsOpen((prev) => !prev)}
        onLeaveMeeting={handleLeaveMeeting}
      />
    </div>
  );
}

