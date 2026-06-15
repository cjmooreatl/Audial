import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerSkipForwardFilled,
} from '@tabler/icons-react';
import { useAudio } from '../store/audio';
import { useAuth } from '../store/auth';
import { useUI } from '../store/ui';
import { CoverArt } from './CoverArt';
import { FilePicker } from './FilePicker';
import { formatPreviewTime } from '../brand/format';

// The persistent broadcast strip at the bottom of every page. Always reserves
// 72px in the app shell — see index.css `.app-shell` — so it never pushes
// content when it appears or disappears.
export function OnAirBar() {
  const current = useAudio((s) => s.current);
  const isPlaying = useAudio((s) => s.isPlaying);
  const toggle = useAudio((s) => s.toggle);
  const next = useAudio((s) => s.next);
  const isAuth = useAuth((s) => s.isAuthenticated);
  const openAuth = useUI((s) => s.openAuth);
  const [, navigate] = useLocation();

  const spotifyReady = useAudio((s) => s.spotifyReady);
  const spotifyConnectMode = useAudio((s) => s.spotifyConnectMode);

  const [progress, setProgress] = useState(0); // 0..1
  const [elapsed, setElapsed] = useState(0); // seconds
  const [pickerOpen, setPickerOpen] = useState(false);
  // When a track gets filed: holds the destination set name briefly so the
  // overlay chip can render and the cover can punch.
  const [filed, setFiled] = useState<string | null>(null);

  // True when Spotify (SDK or Connect) is handling this track's playback.
  const isSpotifyTrack = (spotifyReady || spotifyConnectMode) && !!current?.spotifyTrackId;

  useEffect(() => {
    if (!isPlaying) return;
    const id = window.setInterval(() => {
      if (isSpotifyTrack) {
        // Estimate position: last known SDK position + time elapsed since it was recorded
        const { spotifyPositionMs: pos, spotifyStateTimestamp: ts } = useAudio.getState();
        const estimated = pos + (Date.now() - ts);
        const dur = current?.durationMs ?? 0;
        if (dur > 0) {
          setProgress(Math.min(1, estimated / dur));
          setElapsed(Math.min(dur / 1000, estimated / 1000));
        }
      } else {
        const el = document.querySelector('audio') as HTMLAudioElement | null;
        if (!el || !el.duration || isNaN(el.duration)) return;
        setProgress(el.currentTime / el.duration);
        setElapsed(el.currentTime);
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [isPlaying, isSpotifyTrack, current?.durationMs]);

  // Reset progress when the track changes.
  useEffect(() => {
    setProgress(0);
    setElapsed(0);
  }, [current?.itunesTrackId]);

  if (!current) {
    // The 72px reservation is satisfied by .app-shell padding-bottom — this
    // returns a hidden element so the bar can `position: fixed` cleanly.
    return <div className="on-air-rail empty" aria-hidden="true" />;
  }

  const previewSeconds = isSpotifyTrack ? current.durationMs / 1000 : Math.min(30, current.durationMs / 1000);

  const handleFile = () => {
    if (!isAuth) {
      openAuth(() => setPickerOpen(true));
      return;
    }
    setPickerOpen((v) => !v);
  };

  return (
    <>
      <motion.div
        className="on-air-rail on-ink"
        initial={{ y: 72 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
      >
        {/* Cover — punches on file action */}
        <motion.div
          className="oab-cover"
          onClick={() => current.setId && navigate(`/s/${current.setId}`)}
          animate={filed ? { scale: [1, 0.96, 1] } : { scale: 1 }}
          transition={{ duration: 0.2, times: [0, 0.4, 1] }}
        >
          <CoverArt
            url={current.coverUrl}
            size={144}
            isPlaying={isPlaying}
            hover={false}
            alt={current.title}
            style={{ width: 72, height: 72 }}
          />
        </motion.div>

        {/* On Air cluster */}
        <div className="oab-live">
          <span className="oab-dot" />
          <span className="mono-label" style={{ color: 'var(--bone)' }}>ON AIR</span>
        </div>

        {/* Marquee */}
        <div className="oab-marquee">
          <div className="marquee-wrap">
            <div className="marquee-inner" key={current.itunesTrackId}>
              <MarqueeContent track={current} />
              <MarqueeContent track={current} />
            </div>
          </div>
        </div>

        {/* Right cluster */}
        <div className="oab-right">
          <span className="mono-meta hide-mobile" style={{ color: 'var(--mist)' }}>
            {formatPreviewTime(elapsed)} / {formatPreviewTime(previewSeconds)}
          </span>
          <button
            className="oab-btn-icon"
            onClick={() => toggle()}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <IconPlayerPauseFilled size={14} /> : <IconPlayerPlayFilled size={14} />}
          </button>
          <button className="oab-btn-icon" onClick={() => next()} aria-label="Skip">
            <IconPlayerSkipForwardFilled size={14} />
          </button>
          <button
            className="oab-file"
            onClick={handleFile}
            style={{ position: 'relative' }}
          >
            FILE TO SET
            {/* The FILED chip overlays the bar without affecting layout */}
            <AnimatePresence>
              {filed && (
                <motion.span
                  className="oab-filed-chip"
                  key={filed}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                  FILED → {filed}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* Progress fill */}
        <div className="oab-progress" style={{ width: `${progress * 100}%` }} />
      </motion.div>

      <AnimatePresence>
        {pickerOpen && current.setId && (
          <motion.div
            className="oab-picker-wrap"
            onClick={() => setPickerOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
          >
            <FilePicker
              track={current}
              onClose={() => setPickerOpen(false)}
              onFiled={(setName) => {
                setPickerOpen(false);
                setFiled(setName);
                window.setTimeout(() => setFiled(null), 1500);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function MarqueeContent({ track }: { track: ReturnType<typeof useAudio.getState>['current'] }) {
  if (!track) return null;
  return (
    <span className="marq-segment">
      <b>{track.artist}</b>
      <span className="dim"> — </span>
      {track.title}
      <span className="dim sep"> /// </span>
      from <b>{track.setTitle ?? '—'}</b>
      <span className="dim sep"> /// </span>
      selected by <b>@{track.ownerHandle ?? '—'}</b>
      <span className="dim sep"> /// </span>
    </span>
  );
}
