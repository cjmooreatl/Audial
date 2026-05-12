import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useLocation } from 'wouter';
import { IconPlayerSkipForwardFilled } from '@tabler/icons-react';
import api, { type TrackSnapshot } from '../api';
import { SectionHeader } from '../components/SectionHeader';
import { CoverArt } from '../components/CoverArt';
import { Avatar } from '../components/Avatar';
import { useAudio } from '../store/audio';
import { useAuth } from '../store/auth';
import { useUI } from '../store/ui';
import { FilePicker } from '../components/FilePicker';
import { formatDuration } from '../brand/format';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [, navigate] = useLocation();
  const playPreview = useAudio((s) => s.playPreview);
  const playWire = useAudio((s) => s.playWire);
  const current = useAudio((s) => s.current);
  const source = useAudio((s) => s.source);
  const isPlaying = useAudio((s) => s.isPlaying);
  const toggle = useAudio((s) => s.toggle);
  const hasInteracted = useAudio((s) => s.hasInteracted);
  const isAuth = useAuth((s) => s.isAuthenticated);
  const openAuth = useUI((s) => s.openAuth);
  const [fileTrack, setFileTrack] = useState<TrackSnapshot | null>(null);

  // Initialize the wire on first arrival, after first interaction.
  useEffect(() => {
    if (hasInteracted && !current) {
      playWire();
    }
  }, [hasInteracted, current, playWire]);

  // Debounce query
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query), 250);
    return () => window.clearTimeout(t);
  }, [query]);

  const { data, isLoading } = useSWR(
    ['/searchAudial', debounced],
    () => api.searchAudial({ query: debounced, limit: 8 }),
  );

  const wireTrack = source === 'wire' ? current : null;

  return (
    <div className="container">
      <div className="search-layout">
        {/* Left column: search + results */}
        <div>
          <input
            className="search-input-display"
            placeholder="Search sets, channels, cuts."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <div className="mono-label" style={{ marginTop: 8, color: 'var(--smoke)' }}>
            RESULTS UPDATE AS YOU TYPE.
          </div>

          {!debounced ? (
            <EmptySearch data={data} />
          ) : (
            <SearchResults
              loading={isLoading}
              data={data}
              onFileTrack={(t) => {
                if (!isAuth) {
                  openAuth(() => setFileTrack(t));
                  return;
                }
                setFileTrack(t);
              }}
              onPreview={(t) =>
                playPreview({
                  ...t,
                  setId: undefined,
                  setTitle: 'Preview',
                  ownerHandle: t.artist,
                  ownerDisplayName: t.artist,
                  ownerAccentColor: '#DCFF1A',
                })
              }
              isCurrentTrack={(id) => current?.itunesTrackId === id && isPlaying}
            />
          )}
        </div>

        {/* Right column: The Wire */}
        <div>
          <div className="wire-panel">
            <div className="wire-head">
              <span><b style={{ color: 'var(--ink)', fontWeight: 500 }}>THE WIRE</b> / NOW BROADCASTING</span>
              <span className="live">
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: source === 'wire' && isPlaying ? 'var(--accent)' : 'var(--mist)', animation: source === 'wire' && isPlaying ? 'signal-pulse 1.6s ease-in-out infinite' : 'none' }} />
                <span style={{ color: 'var(--ink)' }}>LIVE</span>
              </span>
            </div>
            <div className="wire-cover-wrap">
              {wireTrack ? (
                <CoverArt
                  url={wireTrack.coverUrl}
                  size={600}
                  isPlaying={isPlaying}
                  hover={false}
                  alt={wireTrack.title}
                />
              ) : (
                <div className="cover skeleton" style={{ aspectRatio: '1 / 1' }} />
              )}
              {!hasInteracted && !wireTrack && (
                <div
                  className="wire-tap-overlay"
                  onClick={() => {
                    useAudio.getState().markInteracted();
                    playWire();
                  }}
                >
                  TAP TO TUNE IN ▪
                </div>
              )}
            </div>
            <div className="wire-meta">
              {wireTrack ? (
                <>
                  <h3 className="heading" style={{ fontSize: 22, marginBottom: 16, cursor: 'pointer' }} onClick={() => wireTrack.setId && navigate(`/s/${wireTrack.setId}`)}>
                    {wireTrack.setTitle}
                  </h3>
                  <div className="subhead" style={{ fontSize: 17, marginBottom: 6 }}>
                    {wireTrack.artist} — {wireTrack.title}
                  </div>
                  <div className="caption smoke" style={{ marginBottom: 14 }}>
                    by{' '}
                    <span
                      className="ink"
                      style={{ fontWeight: 500, cursor: 'pointer' }}
                      onClick={() => wireTrack.ownerHandle && navigate(`/c/${wireTrack.ownerHandle}`)}
                    >
                      @{wireTrack.ownerHandle}
                    </span>
                  </div>
                  <div className="mono-meta smoke">{formatDuration(wireTrack.durationMs)}</div>
                </>
              ) : (
                <>
                  <div className="skeleton" style={{ height: 22, width: '60%', marginBottom: 16 }} />
                  <div className="skeleton" style={{ height: 17, width: '80%', marginBottom: 6 }} />
                  <div className="skeleton" style={{ height: 13, width: '40%' }} />
                </>
              )}
            </div>
            <div className="wire-actions">
              <button className="wire-action line" onClick={() => toggle()} disabled={!wireTrack}>
                {isPlaying && source === 'wire' ? '▌▌ PAUSE' : '▶ PLAY'}
              </button>
              <button
                className="wire-action fill"
                onClick={() => {
                  if (!wireTrack) return;
                  if (!isAuth) {
                    openAuth(() => setFileTrack(wireTrack));
                    return;
                  }
                  setFileTrack(wireTrack);
                }}
                disabled={!wireTrack}
              >
                FILE TO SET
              </button>
            </div>
            <button className="wire-skip" onClick={() => playWire()}>
              SKIP <IconPlayerSkipForwardFilled size={11} />
            </button>
          </div>
        </div>
      </div>

      {/* Inline file picker as overlay */}
      {fileTrack && (
        <div className="oab-picker-wrap" onClick={() => setFileTrack(null)}>
          <FilePicker
            track={fileTrack}
            onClose={() => setFileTrack(null)}
            onFiled={() => setFileTrack(null)}
            anchor="inline"
          />
        </div>
      )}
    </div>
  );
}

function EmptySearch({ data }: { data: any }) {
  const featured = (data as any)?.channels ?? [];
  const [, navigate] = useLocation();
  return (
    <div style={{ marginTop: 32 }}>
      <h2 className="heading" style={{ fontSize: 28, maxWidth: 520, marginBottom: 32 }}>
        Search for sets, channels, or cuts. Or drift on The Wire.
      </h2>
      <SectionHeader label="FEATURED CURATORS" />
      <div style={{ marginTop: 16 }}>
        {featured.slice(0, 6).map((c: any, i: number) => (
          <div key={c.channel.id} className="channel-card" onClick={() => navigate(`/c/${c.channel.handle}`)}>
            <span className="row-num mono-meta">{String(i + 1).padStart(2, '0')}</span>
            <Avatar
              url={c.channel.avatarUrl}
              size={56}
              accent={c.channel.accentColor}
              handle={c.channel.handle}
              displayName={c.channel.displayName}
            />
            <div style={{ minWidth: 0 }}>
              <div className="subhead" style={{ fontSize: 17 }}>{c.channel.displayName}</div>
              <div className="caption smoke">@{c.channel.handle}{c.notes ? ` · ${c.notes}` : ''}</div>
            </div>
            <div className="mono-meta smoke">{c.tunedIn} TUNED IN</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchResults({
  loading,
  data,
  onFileTrack,
  onPreview,
  isCurrentTrack,
}: {
  loading: boolean;
  data: any;
  onFileTrack: (t: TrackSnapshot) => void;
  onPreview: (t: TrackSnapshot) => void;
  isCurrentTrack: (id: number) => boolean;
}) {
  const [, navigate] = useLocation();
  const sets = (data?.sets ?? []) as any[];
  const channels = (data?.channels ?? []) as any[];
  const tracks = (data?.tracks ?? []) as TrackSnapshot[];

  return (
    <>
      <div className="search-lane">
        <SectionHeader num={1} label="SETS" loading={loading} right={`${sets.length} RESULTS`} />
        <div style={{ marginTop: 16 }}>
          {sets.map((s, i) => (
            <div key={s.setId} className="search-row" onClick={() => navigate(`/s/${s.setId}`)}>
              <span className="row-num">{String(i + 1).padStart(2, '0')}</span>
              <CoverArt url={s.coverUrl} size={120} hover={false} style={{ width: 56, height: 56 }} />
              <div style={{ minWidth: 0 }}>
                <div className="subhead" style={{ fontSize: 17 }}>{s.title}</div>
                <div className="caption smoke">by @{s.owner.handle} · {s.trackCount} CUTS</div>
              </div>
              <span />
              <span />
            </div>
          ))}
          {!loading && sets.length === 0 && <div className="caption smoke" style={{ padding: 24 }}>No sets match.</div>}
        </div>
      </div>

      <div className="search-lane">
        <SectionHeader num={2} label="CHANNELS" loading={loading} right={`${channels.length} RESULTS`} />
        <div style={{ marginTop: 16 }}>
          {channels.map((c, i) => (
            <div key={c.channel.id} className="channel-card" onClick={() => navigate(`/c/${c.channel.handle}`)}>
              <span className="row-num mono-meta">{String(i + 1).padStart(2, '0')}</span>
              <Avatar url={c.channel.avatarUrl} size={56} accent={c.channel.accentColor} handle={c.channel.handle} displayName={c.channel.displayName} />
              <div style={{ minWidth: 0 }}>
                <div className="subhead" style={{ fontSize: 17 }}>{c.channel.displayName}</div>
                <div className="caption smoke">@{c.channel.handle}{c.notes ? ` · ${c.notes}` : ''}</div>
              </div>
              <div className="mono-meta smoke">{c.tunedIn} TUNED IN</div>
            </div>
          ))}
          {!loading && channels.length === 0 && <div className="caption smoke" style={{ padding: 24 }}>No channels match.</div>}
        </div>
      </div>

      <div className="search-lane">
        <SectionHeader num={3} label="CUTS" loading={loading} right={`${tracks.length} RESULTS`} />
        <div style={{ marginTop: 16 }}>
          {tracks.map((t, i) => (
            <div key={t.itunesTrackId} className={`search-row ${isCurrentTrack(t.itunesTrackId) ? 'is-playing' : ''}`}>
              <span className="row-num">{String(i + 1).padStart(2, '0')}</span>
              <div onClick={() => t.previewUrl && onPreview(t)} style={{ cursor: t.previewUrl ? 'pointer' : 'default' }}>
                <CoverArt url={t.coverUrl} size={120} hover={!!t.previewUrl} style={{ width: 56, height: 56 }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="subhead" style={{ fontSize: 17 }}>{t.title}</div>
                <div className="caption smoke">{t.artist}</div>
              </div>
              <span className="mono-meta smoke">{formatDuration(t.durationMs)}</span>
              <button
                className="btn-icon"
                onClick={() => onFileTrack(t)}
                disabled={!t.previewUrl}
                aria-label="File"
                title={t.previewUrl ? 'File to set' : 'No preview available'}
              >
                +
              </button>
            </div>
          ))}
          {!loading && tracks.length === 0 && <div className="caption smoke" style={{ padding: 24 }}>No cuts match.</div>}
        </div>
      </div>
    </>
  );
}
