import { useEffect, useRef } from 'react';
import { useAudio } from '../store/audio';
import { useAuth } from '../store/auth';
import { getValidSpotifyToken, getAvailableDevices } from '../lib/spotify';
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

// Detected once at module load — doesn't change during a session.
const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

async function spotifyPlay(deviceId: string, trackId: string): Promise<void> {
  const token = await getValidSpotifyToken();
  if (!token) return;
  await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ uris: [`spotify:track:${trackId}`] }),
  });
}

async function spotifyPause(): Promise<void> {
  const token = await getValidSpotifyToken();
  if (!token) return;
  await fetch('https://api.spotify.com/v1/me/player/pause', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function spotifyResume(): Promise<void> {
  const token = await getValidSpotifyToken();
  if (!token) return;
  await fetch('https://api.spotify.com/v1/me/player/play', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Picks the best available Spotify Connect device: prefer active, then smartphone, then any.
async function pickConnectDevice(): Promise<string | null> {
  const token = await getValidSpotifyToken().catch(() => null);
  if (!token) return null;
  const devices = await getAvailableDevices(token);
  const device =
    devices.find((d) => d.isActive) ??
    devices.find((d) => d.type === 'Smartphone') ??
    devices[0] ??
    null;
  return device?.id ?? null;
}

// Sends a play command to Spotify. deviceId=null means "use Spotify's currently active device."
// Returns true if the command was accepted (2xx or 204).
async function connectPlay(deviceId: string | null, trackId: string): Promise<boolean> {
  const token = await getValidSpotifyToken().catch(() => null);
  if (!token) return false;
  const url = deviceId
    ? `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`
    : 'https://api.spotify.com/v1/me/player/play';
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ uris: [`spotify:track:${trackId}`] }),
  });
  return res.ok || res.status === 204;
}

// Single global audio element + Spotify SDK/Connect player. Only one instance exists in the app.
export function AudioController() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sdkPlayerRef = useRef<SpotifySDKPlayer | null>(null);
  const prevPositionRef = useRef<number>(0);
  const playingSpotifyIdRef = useRef<string | null>(null);

  const current = useAudio((s) => s.current);
  const isPlaying = useAudio((s) => s.isPlaying);
  const spotifyDeviceId = useAudio((s) => s.spotifyDeviceId);
  const spotifyReady = useAudio((s) => s.spotifyReady);
  const spotifyConnectMode = useAudio((s) => s.spotifyConnectMode);
  const onEnded = useAudio((s) => s.onEnded);
  const setSpotifyDevice = useAudio((s) => s.setSpotifyDevice);
  const setSpotifyConnectMode = useAudio((s) => s.setSpotifyConnectMode);
  const setSpotifyState = useAudio((s) => s.setSpotifyState);

  const channel = useAuth((s) => s.channel);
  const isAuthenticated = useAuth((s) => s.isAuthenticated);

  const isPremium = channel?.spotifyIsPremium ?? false;
  const isSpotifyConnected = channel?.spotifyConnected ?? false;

  // ── Mobile: Spotify Connect init ──────────────────────────────────────────
  useEffect(() => {
    if (!isMobile || !isPremium || !isSpotifyConnected) {
      if (isMobile) {
        setSpotifyConnectMode(false);
        setSpotifyDevice(null, false);
      }
      return;
    }
    setSpotifyConnectMode(true);
    // Pre-fetch a device so spotifyReady can be true before the user taps play.
    pickConnectDevice().then((id) => {
      if (id) setSpotifyDevice(id, true);
    });
  }, [isPremium, isSpotifyConnected]);

  // ── Desktop: Spotify Web Playback SDK init ────────────────────────────────
  useEffect(() => {
    if (isMobile || !isPremium || !isSpotifyConnected) return;

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

  // ── Mobile Connect: poll Spotify for position + track-end detection ───────
  useEffect(() => {
    if (!spotifyConnectMode || !isPlaying || !current?.spotifyTrackId) return;
    const id = window.setInterval(async () => {
      const token = await getValidSpotifyToken().catch(() => null);
      if (!token) return;
      const res = await fetch('https://api.spotify.com/v1/me/player', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 204 || !res.ok) {
        // No active playback — track finished
        if (prevPositionRef.current > 2000) {
          prevPositionRef.current = 0;
          playingSpotifyIdRef.current = null;
          useAudio.getState().onEnded();
        }
        return;
      }
      const state = await res.json();
      const pos: number = state.progress_ms ?? 0;
      setSpotifyState(pos);
      if (!state.is_playing && pos < 1000 && prevPositionRef.current > 2000) {
        prevPositionRef.current = 0;
        playingSpotifyIdRef.current = null;
        useAudio.getState().onEnded();
        return;
      }
      prevPositionRef.current = pos;
    }, 1000);
    return () => window.clearInterval(id);
  }, [spotifyConnectMode, isPlaying, current?.spotifyTrackId]);

  // ── Route playback ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!current) return;

    const canUseSpotify = isPremium && isSpotifyConnected && !!current.spotifyTrackId;
    const useSDK = canUseSpotify && !isMobile && spotifyReady && !!spotifyDeviceId;
    const useConnect = canUseSpotify && isMobile;


    if (useSDK) {
      // ── Spotify Web Playback SDK (desktop) ──
      const audioEl = audioRef.current;
      if (audioEl && !audioEl.paused) { audioEl.pause(); audioEl.src = ''; }

      const trackId = current.spotifyTrackId!;
      if (isPlaying) {
        if (playingSpotifyIdRef.current !== trackId) {
          playingSpotifyIdRef.current = trackId;
          prevPositionRef.current = 0;
          setSpotifyState(0);
          spotifyPlay(spotifyDeviceId!, trackId);
        } else {
          sdkPlayerRef.current?.resume();
        }
      } else {
        sdkPlayerRef.current?.pause();
      }

    } else if (useConnect) {
      // ── Spotify Connect (mobile) ──
      const audioEl = audioRef.current;
      if (audioEl && !audioEl.paused) { audioEl.pause(); audioEl.src = ''; }

      const trackId = current.spotifyTrackId!;
      const previewUrl = current.previewUrl;
      if (isPlaying) {
        if (playingSpotifyIdRef.current !== trackId) {
          // New track: find a device and start it
          playingSpotifyIdRef.current = trackId;
          prevPositionRef.current = 0;
          setSpotifyState(0);
          ;(async () => {
            const deviceId = await pickConnectDevice();
            if (deviceId) setSpotifyDevice(deviceId, true);
            // Try with the discovered device first; if none found, try Spotify's "last active"
            const ok = await connectPlay(deviceId, trackId);
            if (!ok) {
              // Both attempts failed — fall back to preview or skip
              if (previewUrl && audioRef.current) {
                audioRef.current.src = previewUrl;
                audioRef.current.play().catch(() => {});
              } else {
                useAudio.getState().onEnded();
              }
            }
          })();
        } else {
          // Same track: resume
          spotifyResume();
        }
      } else {
        spotifyPause();
      }

    } else {
      // ── HTML <audio> preview ──
      if (sdkPlayerRef.current && playingSpotifyIdRef.current) {
        sdkPlayerRef.current.pause();
        playingSpotifyIdRef.current = null;
      }

      const el = audioRef.current;
      if (!el) return;

      const url = current.previewUrl ?? '';
      if (el.src !== url) el.src = url;

      if (!url) {
        if (isPlaying) onEnded();
        return;
      }

      if (isPlaying) {
        el.play().catch(() => useAudio.setState({ isPlaying: false }));
      } else {
        el.pause();
      }
    }
  }, [isPlaying, current?.spotifyTrackId, current?.previewUrl, spotifyReady, spotifyDeviceId, isPremium, isSpotifyConnected, spotifyConnectMode]);

  // ── Spin logging ──────────────────────────────────────────────────────────
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
