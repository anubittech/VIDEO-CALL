'use client';

import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, VideoOff, MonitorUp } from 'lucide-react';
import styles from './VideoTile.module.css';

interface VideoTileProps {
  stream: MediaStream | null;
  name: string;
  isLocal?: boolean;
  isHost?: boolean;
  isAudioMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing?: boolean;
  connectionState?: RTCPeerConnectionState;
}

export const VideoTile: React.FC<VideoTileProps> = ({
  stream,
  name,
  isLocal = false,
  isHost = false,
  isAudioMuted,
  isVideoOff,
  isScreenSharing = false,
  connectionState,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (stream && videoEl.srcObject !== stream) {
      videoEl.srcObject = stream;
      videoEl.play().catch(() => {
        // Autoplay restriction handled gracefully
      });
    } else if (!stream) {
      videoEl.srcObject = null;
    }
  }, [stream, isVideoOff, isScreenSharing]);

  const hasActiveVideoTrack = Boolean(
    stream &&
      stream.getVideoTracks().length > 0 &&
      (!isVideoOff || isScreenSharing)
  );

  const initials = (name || 'User')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`${styles.tile} ${
        isScreenSharing ? styles.tileScreenShare : ''
      }`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`${styles.videoElement} ${
          isLocal && !isScreenSharing ? styles.mirrored : ''
        } ${isScreenSharing ? styles.containedVideo : ''} ${
          !hasActiveVideoTrack ? styles.hiddenVideo : ''
        }`}
      />

      {!hasActiveVideoTrack && (
        <div className={styles.avatarFallback}>
          <div className={styles.avatarCircle}>{initials}</div>
          <span className={styles.cameraOffText}>
            {isVideoOff ? 'Camera is off' : 'Connecting video stream...'}
          </span>
        </div>
      )}

      <div className={styles.topOverlay}>
        <div>
          {isScreenSharing && (
            <div className={styles.screenBadge}>
              <MonitorUp size={14} />
              <span>{isLocal ? 'You are sharing your screen' : `${name}'s Screen`}</span>
            </div>
          )}
        </div>
        {!isLocal &&
          connectionState &&
          connectionState !== 'connected' &&
          connectionState !== 'new' && (
            <span className={styles.connectionChip}>
              Peer: {connectionState}
            </span>
          )}
      </div>

      <div className={styles.bottomBar}>
        <div className={styles.participantTag}>
          <span className={styles.nameText}>
            {name} {isLocal ? '(You)' : ''}
          </span>
          {isHost && <span className={styles.hostPill}>Host</span>}
        </div>

        <div className={styles.statusIcons}>
          {isVideoOff && !isScreenSharing && (
            <div
              className={`${styles.statusPill} ${styles.statusPillMuted}`}
              title="Camera disabled"
            >
              <VideoOff size={14} />
            </div>
          )}
          <div
            className={`${styles.statusPill} ${
              isAudioMuted ? styles.statusPillMuted : ''
            }`}
            title={isAudioMuted ? 'Microphone muted' : 'Microphone active'}
          >
            {isAudioMuted ? <MicOff size={14} /> : <Mic size={14} />}
          </div>
        </div>
      </div>
    </div>
  );
};

