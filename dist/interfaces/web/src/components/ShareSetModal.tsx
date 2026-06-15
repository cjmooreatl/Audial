import { useEffect, useRef, useState } from 'react';
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
import {
  getValidSpotifyToken,
  getUserPlaylists,
  getPlaylistById,
  hashSpotifyId,
  type SpotifyPlaylist,
} from '../lib/spotify';
import { getPreviewUrl } from '../lib/itunes';

type Mode = 'build' | 'url' | 'library';

export function ShareSetModal() {
  const open = useUI((s) => s.shareOpen);
  const close = useUI((s) => s.closeShare);
  const openConnectSpotify = useUI((s) => s.openConnectSpotify);
  const refreshAuth = useAuth((s) => s.refresh);
  const channel = useAuth((s) => s.channel);
  const [, navigate] = useLocation();

  const isSpotifyConnected = channel?.spotifyConnected ?? false;

  const [mode, setMode] = useState<Mode>('build');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build mode
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [tracks, setTracks] = useState<TrackSnapshot[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TrackSnapshot[]>([]);
  const [searching, setSearching] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const searchTimer = useRef<number | null>(null);

  // URL mode
  const [url, setUrl] = useState('');

  // Library mode
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[] | null>(null);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [playlistLoadError, setPlaylistLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<SpotifyPlaylist | null>(null);

  // Reset everything when modal opens
  useEffect(() => {
    if (open) {
      setMode('build');
      setSubmitting(false);
      setError(null);
      setTitle('');
      setDescription('');
      setCoverUrl(null);
      setTracks([]);
      setSearchQuery('');
      setSearchResults([]);
      setShowCoverPicker(false);
      setUrl('');
      setPlaylists(null);
      setPlaylistLoadError(null);
      setFilter('');
      setSelected(null);
    }
  }, [open]);

  // Debounced track search (build mode)
  useEffect(() => {
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    setSearching(true);
    searchTimer.current = window.setTimeout(async () => {
      try {
        const { tracks: results } = await api.searchITunesTracks({ query: searchQuery, limit: 12 });
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => { if (searchTimer.current) window.clearTimeout(searchTimer.current); };
  }, [searchQuery]);

  const addTrack = (t: TrackSnapshot) => {
    if (tracks.some((x) => x.itunesTrackId === t.itunesTrackId)) return;
    setTracks([...tracks, { ...t, addedAt: Date.now() }]);
  };
  const removeTrack = (id: number) => setTracks(tracks.filter((t) => t.itunesTrackId !== id));
  const totalMs = tracks.reduce((sum, t) => sum + t.durationMs, 0);

  const loadPlaylists = async () => {
    setLoadingPlaylists(true);
    setPlaylistLoadError(null);
    try {
      const token = await getValidSpotifyToken();
      if (!token) throw new Error('Could not get a Spotify token. Try disconnecting and reconnecting Spotify.');
      setPlaylists(await getUserPlaylists(token));
    } catch (err: any) {
      setPlaylistLoadError(err?.message ?? 'Failed to load playlists.');
    } finally {
      setLoadingPlaylists(false);
    }
  };

  const handleModeSwitch = (next: Mode) => {
    setMode(next);
    setError(null);
    if (next === 'library' && !playlists) loadPlaylists();
  };

  const submitBuild = async () => {
    if (!title.trim()) { setError('Title is required.'); return; }
    setError(null);
    setSubmitting(true);
    try {
      const { set } = await api.compileSet({
        title: title.trim(),
        description: description.trim() || undefined,
        coverUrl: coverUrl ?? undefined,
        tracks,
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

  const submitUrl = async () => {
    if (!url.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      const match = url.trim().match(/playlist\/([a-zA-Z0-9]+)/);
      if (!match) throw new Error('Invalid Spotify playlist URL. Paste a link from open.spotify.com.');

      const token = await getValidSpotifyToken();
      if (!token) throw new Error('Connect Spotify first to import by URL.');

      const playlist = await getPlaylistById(token, match[1]);
      if (!playlist.tracks.length) throw new Error('This playlist has no tracks.');

      const now = Date.now();
      const BATCH = 10;
      const tracks: TrackSnapshot[] = [];
      for (let i = 0; i < playlist.tracks.length; i += BATCH) {
        const batch = playlist.tracks.slice(i, i + BATCH);
        const enriched = await Promise.all(batch.map(async (t) => ({
          itunesTrackId: hashSpotifyId(t.spotifyId),
          spotifyTrackId: t.spotifyId || undefined,
          title: t.title,
          artist: t.artist,
          albumName: t.albumName,
          coverUrl: t.coverUrl ?? '',
          previewUrl: t.previewUrl ?? await getPreviewUrl(t.title, t.artist).catch(() => null),
          durationMs: t.durationMs,
          addedAt: now,
        } as TrackSnapshot)));
        tracks.push(...enriched);
      }

      const { set } = await api.compileSet({
        title: playlist.name,
        description: playlist.description ?? undefined,
        coverUrl: playlist.coverUrl ?? undefined,
        tracks,
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

  const submitLibrary = async () => {
    if (!selected) return;
    setError(null);
    setSubmitting(true);
    try {
      const token = await getValidSpotifyToken();
      if (!token) throw new Error('Could not get a Spotify token. Try reconnecting.');

      const playlist = await getPlaylistById(token, selected.id);
      if (!playlist.tracks.length) throw new Error('This playlist has no tracks.');

      const now = Date.now();
      const BATCH = 10;
      const tracks: TrackSnapshot[] = [];
      for (let i = 0; i < playlist.tracks.length; i += BATCH) {
        const batch = playlist.tracks.slice(i, i + BATCH);
        const enriched = await Promise.all(batch.map(async (t) => ({
          itunesTrackId: hashSpotifyId(t.spotifyId),
          spotifyTrackId: t.spotifyId || undefined,
          title: t.title,
          artist: t.artist,
          albumName: t.albumName,
          coverUrl: t.coverUrl ?? '',
          previewUrl: t.previewUrl ?? await getPreviewUrl(t.title, t.artist).catch(() => null),
          durationMs: t.durationMs,
          addedAt: now,
        } as TrackSnapshot)));
        tracks.push(...enriched);
      }

      const { set } = await api.compileSet({
        title: selected.name,
        description: selected.description ?? undefined,
        coverUrl: selected.coverUrl ?? undefined,
        tracks,
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

  const handleSubmit = mode === 'build' ? submitBuild : mode === 'url' ? submitUrl : submitLibrary;
  const canSubmit = mode === 'build' ? !!title.trim() : mode === 'url' ? !!url.trim() : !!selected;
  const submitLabel = mode === 'build' ? 'COMPILE' : 'IMPORT';

  const previewCover = coverUrl || tracks[0]?.coverUrl;
  const filtered = playlists?.filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()));

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
            disabled={!canSubmit || submitting}
            style={{ minWidth: 120 }}
          >
            {submitting ? <Spinner /> : submitLabel}
          </button>
        </>
      }
    >
      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 28, borderBottom: '1px solid var(--mist)', paddingBottom: 16 }}>
        <button
          className={`btn-text mono-label ${mode === 'build' ? '' : 'smoke'}`}
          onClick={() => handleModeSwitch('build')}
        >
          SEARCH
        </button>
        <button
          className={`btn-text mono-label ${mode === 'url' ? '' : 'smoke'}`}
          onClick={() => handleModeSwitch('url')}
        >
          SPOTIFY URL
        </button>
        {isSpotifyConnected && (
          <button
            className={`btn-text mono-label ${mode === 'library' ? '' : 'smoke'}`}
            onClick={() => handleModeSwitch('library')}
          >
            MY LIBRARY
          </button>
        )}
      </div>

      {/* BUILD mode */}
      {mode === 'build' && (
        <>
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
        </>
      )}

      {/* URL mode */}
      {mode === 'url' && (
        <>
          <input
            className="input-text"
            placeholder="Paste a Spotify playlist URL."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter' && url.trim()) submitUrl(); }}
            style={{ fontFamily: 'var(--font-mono)' }}
          />
          <p className="caption smoke" style={{ marginTop: 12, maxWidth: 460 }}>
            Paste any public Spotify playlist URL. We'll resolve it and match tracks against the iTunes catalog.
          </p>
        </>
      )}

      {/* LIBRARY mode */}
      {mode === 'library' && (
        <>
          {loadingPlaylists ? (
            <div style={{ padding: '32px 0', textAlign: 'center' }}><Spinner /></div>
          ) : playlists ? (
            <>
              <input
                className="input-text"
                placeholder="Filter playlists..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                style={{ marginBottom: 12 }}
                autoFocus
              />
              <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                {filtered?.length === 0 && (
                  <p className="caption smoke" style={{ padding: '16px 0' }}>No playlists match.</p>
                )}
                {filtered?.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      width: '100%', padding: '8px', marginBottom: 2,
                      background: selected?.id === p.id ? 'var(--mist)' : 'none',
                      border: 'none',
                      borderLeft: selected?.id === p.id ? '2px solid var(--accent, #DCFF1A)' : '2px solid transparent',
                      cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    {p.coverUrl ? (
                      <img src={p.coverUrl} alt={p.name} style={{ width: 40, height: 40, objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 40, height: 40, background: 'var(--mist)', flexShrink: 0 }} />
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div className="subhead" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      {p.trackCount > 0 && <div className="mono-meta smoke">{p.trackCount} TRACKS</div>}
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : playlistLoadError ? (
            <div style={{ padding: '24px 0' }}>
              <p className="caption smoke">{playlistLoadError}</p>
              <button className="btn btn-line" style={{ marginTop: 16 }} onClick={loadPlaylists}>
                RETRY
              </button>
            </div>
          ) : (
            <div style={{ padding: '24px 0' }}>
              <p className="caption smoke">Connect Spotify to browse your playlists.</p>
              <button
                className="btn btn-line"
                style={{ marginTop: 16 }}
                onClick={() => { close(); openConnectSpotify(); }}
              >
                CONNECT SPOTIFY
              </button>
            </div>
          )}
        </>
      )}

      {error && (
        <div className="mono-label heat" style={{ marginTop: 16 }}>
          <span className="heat">▪</span> {error}
        </div>
      )}
    </Modal>
  );
}
