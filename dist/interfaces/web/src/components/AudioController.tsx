import { useEffect, useRef } from 'react';
import { useAudio } from '../store/audio';
import api from '../api';
import { useAuth } from '../store/auth';

// Single global audio element. Owns the actual <audio> tag and routes state
// to/from the audio store. Only one instance should exist in the app tree.
export function AudioController() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const current = useAudio((s) => s.current);
  const isPlaying = useAudio((s) => s.isPlaying);
  const onEnded = useAudio((s) => s.onEnded);
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  const spinLoggedRef = useRef<{ trackId: number | null; setId: string | null }>({
    trackId: null,
    setId: null,
  });

  // Set src when track changes.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (current?.previewUrl) {
      if (el.src !== current.previewUrl) {
        el.src = current.previewUrl;
        spinLoggedRef.current = { trackId: null, setId: null };
      }
    } else {
      el.src = '';
    }
  }, [current?.previewUrl]);

  // Reflect isPlaying.
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !current) return;
    if (isPlaying) {
      el.play().catch(() => {
        // Browser blocked autoplay — flip the store back to paused so the UI
        // shows a play button. The user's first interaction will resume.
        useAudio.setState({ isPlaying: false });
      });
    } else {
      el.pause();
    }
  }, [isPlaying, current]);

  // Spin logging: only after 5s of actual playback, only once per (track, set).
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !current?.setId || !isAuthenticated) return;
    let timer: number | null = null;
    const handler = () => {
      if (
        spinLoggedRef.current.trackId === current.itunesTrackId &&
        spinLoggedRef.current.setId === current.setId
      )
        return;
      if (timer != null) return;
      timer = window.setTimeout(async () => {
        if (
          spinLoggedRef.current.trackId === current.itunesTrackId &&
          spinLoggedRef.current.setId === current.setId
        )
          return;
        spinLoggedRef.current = { trackId: current.itunesTrackId, setId: current.setId ?? null };
        try {
          await api.logSpin({ setId: current.setId!, trackItunesId: current.itunesTrackId });
        } catch (err) {
          // Silent — spin logging failures are non-critical.
          console.debug('logSpin failed', err);
        }
      }, 5000);
    };
    const cancel = () => {
      if (timer != null) {
        window.clearTimeout(timer);
        timer = null;
      }
    };
    if (isPlaying) handler();
    el.addEventListener('pause', cancel);
    return () => {
      cancel();
      el.removeEventListener('pause', cancel);
    };
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
