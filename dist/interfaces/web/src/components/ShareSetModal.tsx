import { useState } from 'react';
import { useLocation } from 'wouter';
import { Modal } from './Modal';
import { Spinner } from './Spinner';
import api, { type TrackSnapshot } from '../api';
import { useUI } from '../store/ui';
import { useAuth } from '../store/auth';
import {
  getValidSpotifyToken,
  getUserPlaylists,
  getPlaylistTracks,
  type SpotifyPlaylist,
} from '../lib/spotify';
import { lookupTrackByQuery } from '../lib/itunes';

type Mode = 'url' | 'library';

export function ShareSetModal() {
  const open = useUI((s) => s.shareOpen);
  const close = useUI((s) => s.closeShare);
  const openConnectSpotify = useUI((s) => s.openConnectSpotify);
  const refreshAuth = useAuth((s) => s.refresh);
  const channel = useAuth((s) => s.channel);
  const [, navigate] = useLocation();

  const isSpotifyConnected = channel?.spotifyConnected ?? false;

  const [mode, setMode] = useState<Mode>('url');
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Library mode
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[] | null>(null);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<SpotifyPlaylist | null>(null);
  const [unmatchedCount, setUnmatchedCount] = useState<number | null>(null);

  const loadPlaylists = async () => {
    setLoadingPlaylists(true);
    setError(null);
    try {
      const token = await getValidSpotifyToken();
      if (!token) throw new Error('Could not get a Spotify token. Try reconnecting.');
      setPlaylists(await getUserPlaylists(token));
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load playlists.');
    } finally {
      setLoadingPlaylists(false);
    }
  };

  const handleModeSwitch = (next: Mode) => {
    setMode(next);
    setError(null);
    if (next === 'library' && !playlists) loadPlaylists();
  };

  const submitUrl = async () => {
    if (!url.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      const { set } = await api.importSpotifyPlaylist({ url: url.trim() });
      await refreshAuth();
      setUrl('');
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
    setUnmatchedCount(null);
    try {
      const token = await getValidSpotifyToken();
      if (!token) throw new Error('Could not get a Spotify token. Try reconnecting.');

      const spotifyTracks = await getPlaylistTracks(token, selected.id);
      if (!spotifyTracks.length) throw new Error('This playlist has no tracks.');

      // Match against iTunes in parallel batches of 10
      const BATCH = 10;
      const matched: TrackSnapshot[] = [];
      let unmatched = 0;

      for (let i = 0; i < spotifyTracks.length; i += BATCH) {
        const batch = spotifyTracks.slice(i, i + BATCH);
        const results = await Promise.all(
          batch.map((t) => lookupTrackByQuery(t.title, t.artist).catch(() => null)),
        );
        for (const r of results) {
          if (r) matched.push(r);
          else unmatched++;
        }
      }

      if (!matched.length) throw new Error('No matching tracks found in the iTunes catalog.');

      const { set } = await api.compileSet({
        title: selected.name,
        description: selected.description ?? undefined,
        coverUrl: selected.coverUrl ?? undefined,
        tracks: matched,
      });

      if (unmatched > 0) setUnmatchedCount(unmatched);

      await refreshAuth();
      close();
      navigate(`/s/${set.id}`);
    } catch (err: any) {
      setError(err?.message ?? 'Signal lost. Retry.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = playlists?.filter((p) =>
    p.name.toLowerCase().includes(filter.toLowerCase()),
  );

  const canSubmit = mode === 'url' ? !!url.trim() : !!selected;

  return (
    <Modal
      open={open}
      onClose={close}
      title="SHARE A SET. ▪"
      footer={
        <>
          <button className="btn-text" onClick={close}>CANCEL</button>
          <button
            className="btn btn-fill"
            onClick={mode === 'url' ? submitUrl : submitLibrary}
            disabled={!canSubmit || submitting}
            style={{ minWidth: 120 }}
          >
            {submitting ? <Spinner /> : 'SHARE'}
          </button>
        </>
      }
    >
      {/* Mode toggle — only shown when Spotify is connected */}
      {isSpotifyConnected && (
        <div style={{ display: 'flex', gap: 24, marginBottom: 24, borderBottom: '1px solid var(--mist)', paddingBottom: 16 }}>
          <button
            className={`btn-text mono-label ${mode === 'url' ? '' : 'smoke'}`}
            onClick={() => handleModeSwitch('url')}
          >
            PASTE URL
          </button>
          <button
            className={`btn-text mono-label ${mode === 'library' ? '' : 'smoke'}`}
            onClick={() => handleModeSwitch('library')}
          >
            YOUR LIBRARY
          </button>
        </div>
      )}

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
            We'll resolve the source on Spotify and compile a snapshot into your channel.
            Previews come from Apple's catalogue where available.
          </p>
        </>
      )}

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
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {filtered?.length === 0 && (
                  <p className="caption smoke" style={{ padding: '16px 0' }}>No playlists match.</p>
                )}
                {filtered?.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      width: '100%',
                      padding: '8px',
                      marginBottom: 2,
                      background: selected?.id === p.id ? 'var(--mist)' : 'none',
                      border: 'none',
                      borderLeft: selected?.id === p.id ? '2px solid var(--accent, #DCFF1A)' : '2px solid transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    {p.coverUrl ? (
                      <img src={p.coverUrl} alt={p.name} style={{ width: 32, height: 32, objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 32, height: 32, background: 'var(--mist)', flexShrink: 0 }} />
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div className="subhead" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </div>
                      <div className="mono-meta smoke">{p.trackCount} TRACKS</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
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
      {unmatchedCount !== null && unmatchedCount > 0 && (
        <div className="mono-meta smoke" style={{ marginTop: 8 }}>
          ▪ {unmatchedCount} {unmatchedCount === 1 ? 'cut' : 'cuts'} not found in the iTunes catalog.
        </div>
      )}
    </Modal>
  );
}
