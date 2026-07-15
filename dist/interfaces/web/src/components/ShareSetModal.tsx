import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useLocation } from 'wouter';
import { IconPlus, IconX } from '@tabler/icons-react';
import { Modal } from './Modal';
import { Spinner } from './Spinner';
import { CoverArt } from './CoverArt';
import { SEED_COVER_LIST, sizedCover } from '../brand/seedCovers';
import api, { type TrackSnapshot } from '../api';
import { useUI } from '../store/ui';
import { useAuth } from '../store/auth';
import { formatDuration } from '../brand/format';
import { isValidUrl } from '../lib/validate';

export function ShareSetModal() {
  const open = useUI((s) => s.shareOpen);
  const close = useUI((s) => s.closeShare);
  const refreshAuth = useAuth((s) => s.refresh);
  const [, navigate] = useLocation();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [tracks, setTracks] = useState<TrackSnapshot[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showCoverPicker, setShowCoverPicker] = useState(false);

  // Reset everything when modal opens
  useEffect(() => {
    if (open) {
      setSubmitting(false);
      setError(null);
      setTitle('');
      setDescription('');
      setCoverUrl(null);
      setPlaylistUrl('');
      setTracks([]);
      setSearchQuery('');
      setDebouncedQuery('');
      setShowCoverPicker(false);
    }
  }, [open]);

  // Debounce the query, then let SWR own the fetch — same pattern the Search
  // page uses. A raw setTimeout+fetch here previously had no protection
  // against out-of-order responses: a slower response for an earlier
  // keystroke could resolve after a faster one for a later keystroke and
  // silently overwrite correct results with stale ones. SWR keys each
  // request by the query itself, so a stale response for an old key never
  // clobbers the current key's data.
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  const { data: searchData, isLoading: searching } = useSWR(
    debouncedQuery.trim() ? ['/searchTracks-share', debouncedQuery] : null,
    () => api.searchTracks({ query: debouncedQuery, limit: 12 }),
  );
  const searchResults = searchData?.tracks ?? [];

  const addTrack = (t: TrackSnapshot) => {
    if (tracks.some((x) => x.itunesTrackId === t.itunesTrackId)) return;
    setTracks([...tracks, { ...t, addedAt: Date.now() }]);
  };
  const removeTrack = (id: number) => setTracks(tracks.filter((t) => t.itunesTrackId !== id));
  const totalMs = tracks.reduce((sum, t) => sum + t.durationMs, 0);

  const handleSubmit = async () => {
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!isValidUrl(playlistUrl)) { setError("That doesn't look like a valid URL."); return; }
    setError(null);
    setSubmitting(true);
    try {
      const { set } = await api.compileSet({
        title: title.trim(),
        description: description.trim() || undefined,
        coverUrl: coverUrl ?? undefined,
        tracks,
        playlistUrl: playlistUrl.trim() || null,
      });
      await refreshAuth();
      close();
      navigate(`/s/${set.id}`);
    } catch (err: any) {
      setError(err?.message ?? 'Signal lost. Retry.');
    } finally {
      setSubmitting(false);
    }
  };

  const previewCover = coverUrl || tracks[0]?.coverUrl;

  return (
    <Modal
      open={open}
      onClose={close}
      title="SHARE A SET. ▪"
      width="wide"
      footer={
        <>
          <button className="btn-text" onClick={close}>CANCEL</button>
          <button
            className="btn btn-fill"
            onClick={handleSubmit}
            disabled={!title.trim() || submitting}
            style={{ minWidth: 120 }}
          >
            {submitting ? <Spinner /> : 'COMPILE'}
          </button>
        </>
      }
    >
      <input
        className="input-display"
        placeholder="Title your set."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
      />
      <div style={{ marginTop: 24 }}>
        <textarea
          className="input-textarea"
          placeholder="Liner notes — optional."
          value={description}
          maxLength={280}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          style={{ border: 0, borderBottom: '1px solid var(--ink)', padding: '12px 0' }}
        />
      </div>

      <div style={{ marginTop: 24, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ width: 96, height: 96, flexShrink: 0 }}>
          <CoverArt url={previewCover} size={400} hover={false} alt="Cover" />
        </div>
        <div>
          <div className="mono-label" style={{ marginBottom: 8 }}>COVER</div>
          <button className="btn-text" onClick={() => setShowCoverPicker(!showCoverPicker)}>
            {showCoverPicker ? 'HIDE OPTIONS' : 'PICK A COVER'}
          </button>
          {showCoverPicker && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 48px)', gap: 8, marginTop: 12 }}>
              {SEED_COVER_LIST.map((c) => (
                <button
                  key={c.slot}
                  type="button"
                  onClick={() => setCoverUrl(c.url)}
                  style={{
                    width: 48, height: 48,
                    border: coverUrl === c.url ? '2px solid var(--ink)' : '1px solid var(--mist)',
                    padding: 0, background: 'transparent',
                  }}
                >
                  <img
                    src={sizedCover(c.url, 96) ?? c.url}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <div className="mono-label" style={{ marginBottom: 8 }}>PLAYLIST LINK — OPTIONAL</div>
        <input
          className="input-text"
          placeholder="https://open.spotify.com/playlist/..."
          value={playlistUrl}
          onChange={(e) => setPlaylistUrl(e.target.value)}
          style={{ fontFamily: 'var(--font-mono)' }}
        />
      </div>

      <div style={{ marginTop: 32 }}>
        <div className="mono-label" style={{ marginBottom: 12 }}>ADD CUTS</div>
        <input
          className="input-text"
          placeholder="Search for a track or artist."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {(searching || searchResults.length > 0) && (
          <div style={{ marginTop: 16, maxHeight: 280, overflowY: 'auto' }}>
            {searching && <div className="mono-label smoke" style={{ padding: 12 }}>RECEIVING.</div>}
            {!searching && searchResults.map((t, i) => (
              <div
                key={t.itunesTrackId}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '32px 48px 1fr 60px 36px',
                  gap: 12, alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: '1px solid var(--mist)',
                }}
              >
                <span className="mono-meta smoke">{String(i + 1).padStart(2, '0')}</span>
                <CoverArt url={t.coverUrl} size={120} hover={false} style={{ width: 48, height: 48 }} />
                <div style={{ minWidth: 0 }}>
                  <div className="subhead" style={{ fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                  <div className="caption smoke" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.artist}</div>
                </div>
                <span className="mono-meta smoke">{formatDuration(t.durationMs)}</span>
                <button
                  className="btn-icon"
                  onClick={() => addTrack(t)}
                  disabled={tracks.some((x) => x.itunesTrackId === t.itunesTrackId)}
                  aria-label="Add"
                >
                  <IconPlus size={16} stroke={1.5} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {tracks.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div className="mono-label" style={{ marginBottom: 12 }}>
            TRACKLIST <span className="smoke" style={{ marginLeft: 8 }}>{tracks.length} CUTS · {formatDuration(totalMs)}</span>
          </div>
          {tracks.map((t, i) => (
            <div
              key={t.itunesTrackId}
              style={{
                display: 'grid',
                gridTemplateColumns: '32px 48px 1fr 60px 36px',
                gap: 12, alignItems: 'center',
                padding: '8px 0',
                borderBottom: '1px solid var(--mist)',
              }}
            >
              <span className="mono-meta">{String(i + 1).padStart(2, '0')}</span>
              <CoverArt url={t.coverUrl} size={120} hover={false} style={{ width: 48, height: 48 }} />
              <div style={{ minWidth: 0 }}>
                <div className="subhead" style={{ fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                <div className="caption smoke" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.artist}</div>
              </div>
              <span className="mono-meta smoke">{formatDuration(t.durationMs)}</span>
              <button className="btn-icon" onClick={() => removeTrack(t.itunesTrackId)} aria-label="Remove">
                <IconX size={16} stroke={1.5} />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="mono-label heat" style={{ marginTop: 16 }}>
          <span className="heat">▪</span> {error}
        </div>
      )}
    </Modal>
  );
}
