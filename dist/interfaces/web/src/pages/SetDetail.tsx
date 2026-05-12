import { useState } from 'react';
import useSWR from 'swr';
import { useLocation, useRoute } from 'wouter';
import { IconShare, IconTrash, IconPencil } from '@tabler/icons-react';
import api, { type TrackSnapshot } from '../api';
import { CoverArt } from '../components/CoverArt';
import { SectionHeader } from '../components/SectionHeader';
import { FilePicker } from '../components/FilePicker';
import { useAudio } from '../store/audio';
import { useAuth } from '../store/auth';
import { useUI } from '../store/ui';
import { formatDuration } from '../brand/format';

export function SetDetailPage() {
  const [, params] = useRoute('/s/:setId');
  const [, navigate] = useLocation();
  const setId = params?.setId ?? '';
  const playChannel = useAudio((s) => s.playChannel);
  const playPreview = useAudio((s) => s.playPreview);
  const current = useAudio((s) => s.current);
  const isPlaying = useAudio((s) => s.isPlaying);
  const isAuth = useAuth((s) => s.isAuthenticated);
  const openAuth = useUI((s) => s.openAuth);
  const openEditSet = useUI((s) => s.openEditSet);
  const [fileTrack, setFileTrack] = useState<TrackSnapshot | null>(null);

  const { data, isLoading, error, mutate } = useSWR(
    ['/getSet', setId],
    () => api.getSet({ setId }),
  );

  if (error) {
    return (
      <div className="container" style={{ padding: '96px 0' }}>
        <h2 className="heading">Set not found.</h2>
        <button className="btn-text" onClick={() => navigate('/')} style={{ marginTop: 16 }}>← BACK</button>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="container">
        <div className="set-detail-hero">
          <div className="cover skeleton" style={{ aspectRatio: '1 / 1' }} />
          <div>
            <div className="skeleton" style={{ height: 11, width: 140, marginBottom: 16 }} />
            <div className="skeleton" style={{ height: 36, width: '70%', marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 13, width: 200 }} />
          </div>
        </div>
      </div>
    );
  }

  const set = (data as any).set;
  const owner = (data as any).owner;
  const viewerIsOwner: boolean = (data as any).viewerIsOwner;

  const playAll = () => {
    if (!set.tracks?.length) return;
    playChannel(set.tracks, {
      setId: set.id,
      setTitle: set.title,
      ownerHandle: owner.handle,
      ownerAccentColor: owner.accentColor,
    });
  };

  const playOne = (t: TrackSnapshot) => {
    if (!t.previewUrl) return;
    playPreview({
      ...t,
      setId: set.id,
      setTitle: set.title,
      ownerHandle: owner.handle,
      ownerAccentColor: owner.accentColor,
    });
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ url, title: `Audial — ${set.title}` });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
      } catch {}
    }
  };

  const deleteSet = async () => {
    if (!confirm('Delete this set permanently?')) return;
    try {
      await api.deleteSet({ setId });
      navigate(`/c/${owner.handle}`);
    } catch (err: any) {
      alert(err?.message ?? 'Signal lost. Retry.');
    }
  };

  return (
    <div
      className="container"
      style={{ '--accent': owner.accentColor } as React.CSSProperties}
    >
      <button className="btn-text" onClick={() => navigate(`/c/${owner.handle}`)} style={{ marginTop: 16 }}>
        ← BACK TO @{owner.handle}
      </button>
      <div className="set-detail-hero">
        <div>
          <CoverArt url={set.coverUrl} size={800} alt={set.title} hover={false} isPlaying={current?.setId === set.id && isPlaying} />
        </div>
        <div>
          <div className="mono-label" style={{ marginBottom: 16 }}>
            ▪ SET BY <span className="ink" style={{ fontWeight: 500 }}>@{owner.handle}</span>
          </div>
          <h1 className="display" style={{ fontSize: 'clamp(36px, 6vw, 56px)', marginBottom: 14 }}>
            {set.title}
          </h1>
          <div className="mono-meta smoke" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
            {set.trackCount} CUTS · {formatDuration(set.totalDurationMs)}
          </div>
          {set.description && (
            <p className="caption" style={{ marginBottom: 24, maxWidth: 520 }}>{set.description}</p>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-fill" onClick={playAll} disabled={!set.tracks?.length}>
              ▶ PLAY ALL
            </button>
            <button className="btn btn-line" onClick={share}>
              <IconShare size={14} stroke={1.5} /> SHARE
            </button>
            {viewerIsOwner && (
              <>
                <button className="btn btn-line" onClick={() => openEditSet(setId)}>
                  <IconPencil size={14} stroke={1.5} /> EDIT
                </button>
                <button className="btn btn-line" onClick={deleteSet} style={{ color: 'var(--heat)', borderColor: 'var(--heat)' }}>
                  <IconTrash size={14} stroke={1.5} /> DELETE
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Track list */}
      <div className="set-tracklist">
        <SectionHeader num={1} label="TRACK LIST" right={`${set.trackCount} CUTS`} />
        <div style={{ marginTop: 16 }}>
          {set.tracks.map((t: TrackSnapshot, i: number) => {
            const isThis = current?.itunesTrackId === t.itunesTrackId && (current?.setId === set.id || isPlaying);
            const playable = !!t.previewUrl;
            return (
              <div
                key={t.itunesTrackId}
                className={`track-row ${isThis && isPlaying ? 'is-playing' : ''}`}
                onClick={() => playable && playOne(t)}
                style={{ cursor: playable ? 'pointer' : 'default' }}
              >
                <span className="row-num mono-meta">{String(i + 1).padStart(2, '0')}</span>
                <CoverArt url={t.coverUrl} size={120} hover={false} style={{ width: 56, height: 56 }} />
                <div style={{ minWidth: 0 }}>
                  <div className="subhead" style={{ fontSize: 17 }}>{t.title}</div>
                  <div className="caption smoke">
                    {t.artist}{!playable ? ' · NO PREVIEW' : ''}
                  </div>
                </div>
                <span className="mono-meta smoke">{formatDuration(t.durationMs)}</span>
                {!viewerIsOwner && playable ? (
                  <button
                    className="btn-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isAuth) {
                        openAuth(() => setFileTrack(t));
                        return;
                      }
                      setFileTrack(t);
                    }}
                    aria-label="File"
                  >
                    +
                  </button>
                ) : (
                  <span />
                )}
              </div>
            );
          })}
          {set.tracks.length === 0 && (
            <div className="empty-state">
              <h3 className="heading">Empty set.</h3>
              {viewerIsOwner && <button className="cta" onClick={() => alert('Use Compile a Set to add cuts.')}>ADD CUTS</button>}
            </div>
          )}
        </div>
      </div>

      {fileTrack && (
        <div className="oab-picker-wrap" onClick={() => setFileTrack(null)}>
          <FilePicker
            track={fileTrack}
            onClose={() => setFileTrack(null)}
            onFiled={() => {
              setFileTrack(null);
              mutate();
            }}
            anchor="inline"
          />
        </div>
      )}
    </div>
  );
}
