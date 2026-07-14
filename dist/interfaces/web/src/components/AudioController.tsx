import { useEffect, useRef } from 'react';
import { useAudio } from '../store/audio';
import { useAuth } from '../store/auth';
import api from '../api';

// Single global audio element. Only one instance exists in the app.
export function AudioController() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const current = useAudio((s) => s.current);
  const isPlaying = useAudio((s) => s.isPlaying);
  const onEnded = useAudio((s) => s.onEnded);

  const isAuthenticated = useAuth((s) => s.isAuthenticated);

  // ── HTML <audio> preview ──
  useEffect(() => {
    if (!current) return;
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
  }, [isPlaying, current?.previewUrl, onEnded]);

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
