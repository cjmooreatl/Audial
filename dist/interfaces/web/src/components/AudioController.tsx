import { useEffect, useRef } from 'react';
import { useAudio } from '../store/audio';
import { useAuth } from '../store/auth';
import api from '../api';
import { resolveDeezerTrack } from '../lib/catalog';

function isDeezerUrl(url: string | null | undefined): boolean {
  return !!url && url.includes('dzcdn.net');
}

// Single global audio element. Only one instance exists in the app.
export function AudioController() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Which track id + url is currently loaded into the <audio> element, so a
  // play/pause toggle on the same track never re-resolves or resets src
  // (that would restart playback from 0 on every pause/resume).
  const loadedRef = useRef<{ trackId: number | null; url: string }>({ trackId: null, url: '' });

  const current = useAudio((s) => s.current);
  const isPlaying = useAudio((s) => s.isPlaying);
  const onEnded = useAudio((s) => s.onEnded);

  const isAuthenticated = useAuth((s) => s.isAuthenticated);

  // ── HTML <audio> preview ──
  useEffect(() => {
    if (!current) return;
    const el = audioRef.current;
    if (!el) return;

    let cancelled = false;

    (async () => {
      if (loadedRef.current.trackId !== current.itunesTrackId) {
        let url = current.previewUrl ?? '';
        // Deezer's preview links expire 15 minutes after being issued — a
        // url stored in a set or picked up on The Wire (as opposed to one
        // just resolved live by a search a moment ago) is almost always
        // already dead by the time it's actually played. Re-resolve a fresh
        // one immediately before playing rather than trust whatever's
        // stored; iTunes-sourced urls are stable and never need this.
        if (isDeezerUrl(url)) {
          const fresh = await resolveDeezerTrack(current.title, current.artist).catch(() => null);
          if (cancelled) return;
          if (fresh?.previewUrl) url = fresh.previewUrl;
        }
        if (cancelled) return;
        loadedRef.current = { trackId: current.itunesTrackId, url };
        el.src = url;
      }

      const url = loadedRef.current.url;
      if (!url) {
        if (isPlaying) onEnded();
        return;
      }

      if (isPlaying) {
        el.play().catch(() => useAudio.setState({ isPlaying: false }));
      } else {
        el.pause();
      }
    })();

    return () => { cancelled = true; };
  }, [isPlaying, current?.previewUrl, current?.itunesTrackId, onEnded]);

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
