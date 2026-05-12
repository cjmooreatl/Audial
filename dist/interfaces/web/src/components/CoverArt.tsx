import type { CSSProperties } from 'react';
import { sizedCover } from '../brand/seedCovers';

interface Props {
  url?: string | null;
  alt?: string;
  size: number; // expected pixel width for CDN sizing
  isPlaying?: boolean;
  hover?: boolean;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}

export function CoverArt({
  url,
  alt = '',
  size,
  isPlaying,
  hover = true,
  className = '',
  style,
  onClick,
}: Props) {
  const sized = sizedCover(url, size);
  const classes = [
    'cover',
    hover ? 'cover-hover' : '',
    isPlaying ? 'is-playing' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={classes} style={style} onClick={onClick}>
      {sized ? (
        <img src={sized} alt={alt} loading="lazy" />
      ) : (
        <div className="skeleton" style={{ width: '100%', height: '100%' }} />
      )}
      {hover && <div className="cover-play-badge">PLAY</div>}
    </div>
  );
}
