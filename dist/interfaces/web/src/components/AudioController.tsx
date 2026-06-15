import { useEffect, useRef } from 'react';
import { useAudio } from '../store/audio';
import { useAuth } from '../store/auth';
import { getValidSpotifyToken } from '../lib/spotify';
import api from '../api';

// Minimal Spotify Web Playback SDK types
declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifySDKPlayer;
    };
  }
}
interface SpotifySDKPlayer {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  seek: (ms: number) => Promise<void>;
  getCurrentState: () => Promise<SpotifySDKState | null>;
  addListener: (event: string, cb: (data: any) => void) => boolean;
  removeListener: (event: string, cb?: (data: any) => void) => boolean;
}
interface SpotifySDKState {
  position: number;
  duration: number;
  paused: boolean;
  track_window: { current_track: { id: string; uri: string; name: string } };
}

async function spotifyPlay(deviceId: string, trackId: string) {
  const token = await getValidSpotifyToken();
  if (!token) return;
  await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ uris: [`spotify:track:${trackId}`] }),
  });
}

// Single global audio element + Spotify SDK player. Only one instance exists in the app.
export function AudioController() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sdkPlayerRef = useRef<SpotifySDKPlayer | null>(null);
  const prevPositionRef = useRef<number>(0);
  const playingSpotifyIdRef = useRef<string | null>(null); // track ID currently loaded in SDK

  const current = useAudio((s) => s.current);
  const isPlaying = useAudio((s) => s.isPlaying);
  const spotifyDeviceId = useAudio((s) => s.spotifyDeviceId);
  const spotifyReady = useAudio((s) => s.spotifyReady);
  const onEnded = useAudio((s) => s.onEnded);
  const setSpotifyDevice = useAudio((s) => s.setSpotifyDevice);
  const setSpotifyState = useAudio((s) => s.setSpotifyState);

  const channel = useAuth((s) => s.channel);
  const isAuthenticated = useAuth((s) => s.isAuthenticated);

  const isPremium = channel?.spotifyIsPremium ?? false;
  const isSpotifyConnected = channel?.spotifyConnected ?? false;

  // Whether the current track should use the Spotify SDK for playback
  const useSpotify = isPremium && isSpotifyConnected && spotifyReady && !!current?.spotifyTrackId;

  // ── Spotify SDK init ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPremium || !isSpotifyConnected) return;

    const initPlayer = () => {
      const player = new window.Spotify.Player({
        name: 'Audial',
        getOAuthToken: async (cb) => {
          const token = await getValidSpotifyToken();
          cb(token ?? '');
        },
        volume: 0.8,
      });

      player.addListener('ready', ({ device_id }: { device_id: string }) => {
        setSpotifyDevice(device_id, true);
      });

      player.addListener('not_ready', () => {
        setSpotifyDevice(null, false);
      });

      player.addListener('player_state_changed', (state: SpotifySDKState | null) => {
        if (!state) return;
        setSpotifyState(state.position);

        // Detect natural track end: position resets to 0 while paused, after having played
        if (state.paused && state.position === 0 && prevPositionRef.current > 1000) {
          prevPositionRef.current = 0;
          playingSpotifyIdRef.current = null;
          useAudio.getState().onEnded();
          return;
        }
        prevPositionRef.current = state.position;
      });

      player.addListener('initialization_error', ({ message }: { message: string }) => {
        console.warn('[Spotify SDK] init error:', message);
      });
      player.addListener('authentication_error', ({ message }: { message: string }) => {
        console.warn('[Spotify SDK] auth error:', message);
        setSpotifyDevice(null, false);
      });
      player.addListener('account_error', ({ message }: { message: string }) => {
        console.warn('[Spotify SDK] account error (Premium required):', message);
        setSpotifyDevice(null, false);
      });

      player.connect();
      sdkPlayerRef.current = player;
    };

    if (window.Spotify) {
      initPlayer();
    } else {
      window.onSpotifyWebPlaybackSDKReady = initPlayer;
      if (!document.querySelector('script[src*="spotify-player"]')) {
        const script = document.createElement('script');
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        document.body.appendChild(script);
      }
    }

    return () => {
      sdkPlayerRef.current?.disconnect();
      sdkPlayerRef.current = null;
      setSpotifyDevice(null, false);
    };
  }, [isPremium, isSpotifyConnected]);

  // ── Route playback: Spotify SDK vs <audio> ────────────────────────────────
  useEffect(() => {
    if (!current) return;

    if (useSpotify && spotifyDeviceId && current.spotifyTrackId) {
      // Spotify SDK path
      const audioEl = audioRef.current;
      if (audioEl && !audioEl.paused) { audioEl.pause(); audioEl.src = ''; }

      if (isPlaying) {
        if (playingSpotifyIdRef.current !== current.spotifyTrackId) {
          // Load and play new track
          playingSpotifyIdRef.current = current.spotifyTrackId;
          prevPositionRef.current = 0;
          setSpotifyState(0);
          spotifyPlay(spotifyDeviceId, current.spotifyTrackId);
        } else {
          sdkPlayerRef.current?.resume();
        }
      } else {
        sdkPlayerRef.current?.pause();
      }
    } else {
      // HTML <audio> path
      if (sdkPlayerRef.current && playingSpotifyIdRef.current) {
        sdkPlayerRef.current.pause();
        playingSpotifyIdRef.current = null;
      }

      const el = audioRef.current;
      if (!el) return;

      const url = current.previewUrl ?? '';
      if (el.src !== url) {
        el.src = url;
      }

      if (!url) {
        // No playable audio for this track — auto-skip
        if (isPlaying) onEnded();
        return;
      }

      if (isPlaying) {
        el.play().catch(() => useAudio.setState({ isPlaying: false }));
      } else {
        el.pause();
      }
    }
  }, [isPlaying, current?.spotifyTrackId, current?.previewUrl, useSpotify, spotifyDeviceId]);

  // ── Spin logging (unchanged) ──────────────────────────────────────────────
  const spinLoggedRef = useRef<{ trackId: number | null; setId: string | null }>({
    trackId: null,
    setId: null,
  });

  useEffect(() => {
    if (!current?.setId || !isAuthenticated) return;
    let timer: number | null = null;
    const log = () => {
      if (
        spinLoggedRef.current.trackId === current.itunesTrackId &&
        spinLoggedRef.current.setId === current.setId
      ) return;
      if (timer != null) return;
      timer = window.setTimeout(async () => {
        if (
          spinLoggedRef.current.trackId === current.itunesTrackId &&
          spinLoggedRef.current.setId === current.setId
        ) return;
        spinLoggedRef.current = { trackId: current.itunesTrackId, setId: current.setId ?? null };
        try {
          await api.logSpin({ setId: current.setId!, trackItunesId: current.itunesTrackId });
        } catch { /* non-critical */ }
      }, 5000);
    };
    const cancel = () => { if (timer != null) { window.clearTimeout(timer); timer = null; } };

    if (isPlaying) log();
    const el = audioRef.current;
    el?.addEventListener('pause', cancel);
    return () => { cancel(); el?.removeEventListener('pause', cancel); };
  }, [isPlaying, current?.itunesTrackId, current?.setId, isAuthenticated]);

  return (
    <audio
      ref={audioRef}
      onEnded={onEnded}
      preload="auto"
      style={{ display: 'none' }}
    />
  );
}
