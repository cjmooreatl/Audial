interface Props {
  url?: string | null;
  size: number;
  accent: string;
  handle?: string | null;
  displayName?: string | null;
}

// Default avatar: a geometric mark in the user's accent. Two tiles
// (light + accent) plus a chartreuse dot for brand DNA.
export function Avatar({ url, size, accent, handle, displayName }: Props) {
  const initial = (displayName || handle || '?').trim().charAt(0).toUpperCase();
  if (url) {
    return (
      <img
        src={url}
        alt={displayName ?? handle ?? ''}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: accent,
        color: 'var(--bone)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: size * 0.42,
        letterSpacing: '-0.02em',
        flexShrink: 0,
        position: 'relative',
        userSelect: 'none',
      }}
      aria-label={displayName ?? handle ?? ''}
    >
      {initial}
    </div>
  );
}
