import { useLocation } from 'wouter';
import type { FeedCard } from '../api';
import { CoverArt } from './CoverArt';
import { formatDuration } from '../brand/format';
import { sectionThemeFor } from '../brand/phrases';
import { useAudio } from '../store/audio';

interface CompactProps {
  card: FeedCard;
  index: number;
  tab: string;
  isPick?: boolean;
}

// The compact card — the workhorse of the feed grid.
export function SetCardCompact({ card, index, tab, isPick }: CompactProps) {
  const [, navigate] = useLocation();
  const currentSetId = useAudio((s) => s.current?.setId);
  const isPlaying = currentSetId === card.setId;
  const sectionLabel = sectionThemeFor(tab, Math.floor(index / 4));

  return (
    <article className="set-card-compact" onClick={() => navigate(`/s/${card.setId}`)}>
      <div className="set-card-compact-pre mono-label">
        <span className="ink">{String(index + 1).padStart(2, '0')}</span>
        <span> / </span>
        <span>{sectionLabel}</span>
        {isPick && <span style={{ color: 'var(--accent)', marginLeft: 6 }}>▪ PICK</span>}
      </div>
      <CoverArt url={card.coverUrl} size={400} alt={card.title} isPlaying={isPlaying} />
      <div className="mono-meta smoke" style={{ marginTop: 12, fontSize: 11 }}>
        {card.trackCount} CUTS · {formatDuration(card.totalDurationMs)}
      </div>
      <h3 className="subhead" style={{ marginTop: 6 }}>
        {card.title}
      </h3>
      <div className="caption smoke" style={{ marginTop: 4 }}>
        by{' '}
        <span
          className="ink"
          style={{ fontWeight: 500 }}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/c/${card.owner.handle}`);
          }}
        >
          @{card.owner.handle}
        </span>
      </div>
    </article>
  );
}

interface HeroProps {
  card: FeedCard;
  isFirstHero?: boolean;
}

export function SetCardHero({ card, isFirstHero }: HeroProps) {
  const [, navigate] = useLocation();
  const currentSetId = useAudio((s) => s.current?.setId);
  const isPlaying = currentSetId === card.setId;

  return (
    <article className="set-card-hero">
      <div className="hero-cover-wrap" onClick={() => navigate(`/s/${card.setId}`)}>
        <CoverArt url={card.coverUrl} size={800} alt={card.title} isPlaying={isPlaying} />
      </div>
      <div className="hero-meta">
        <div className="mono-label" style={{ marginBottom: 16 }}>
          <span className="ink">{isFirstHero ? '01' : '—'}</span> / FEATURED
        </div>
        <h2
          className="display"
          style={{ marginBottom: 14, cursor: 'pointer' }}
          onClick={() => navigate(`/s/${card.setId}`)}
        >
          {card.title}
        </h2>
        <div
          className="caption"
          style={{ marginBottom: 12, cursor: 'pointer' }}
          onClick={() => navigate(`/c/${card.owner.handle}`)}
        >
          by <span className="ink" style={{ fontWeight: 500 }}>@{card.owner.handle}</span>
        </div>
        {card.description && (
          <p className="caption" style={{ marginBottom: 24, maxWidth: 480 }}>
            {card.description}
          </p>
        )}
        <div className="mono-meta smoke" style={{ marginBottom: 20, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          {card.trackCount} CUTS · {formatDuration(card.totalDurationMs)}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-fill"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/s/${card.setId}`);
            }}
          >
            ▶ PLAY
          </button>
          <button
            className="btn btn-line"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/c/${card.owner.handle}`);
            }}
          >
            CHANNEL
          </button>
        </div>
      </div>
    </article>
  );
}
