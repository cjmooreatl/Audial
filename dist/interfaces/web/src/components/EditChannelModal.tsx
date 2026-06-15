import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { IconX } from '@tabler/icons-react';
import { Modal } from './Modal';
import { Spinner } from './Spinner';
import { AccentPicker } from './AccentPicker';
import { useUI } from '../store/ui';
import { useAuth } from '../store/auth';
import api, { type CoSign, type ChannelSetSummary } from '../api';
import { CoverArt } from './CoverArt';

export function EditChannelModal() {
  const open = useUI((s) => s.editChannelOpen);
  const close = useUI((s) => s.closeEditChannel);
  const channel = useAuth((s) => s.channel);
  const refresh = useAuth((s) => s.refresh);

  const [displayName, setDisplayName] = useState('');
  const [notes, setNotes] = useState('');
  const [accent, setAccent] = useState('#7A1F1F');
  const [featuredSetId, setFeaturedSetId] = useState<string | null>(null);
  const [coSigns, setCoSigns] = useState<CoSign[]>([]);
  const [artistQuery, setArtistQuery] = useState('');
  const [artistResults, setArtistResults] = useState<CoSign[]>([]);
  const [searchingArtists, setSearchingArtists] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setPage, setSetPage] = useState(0);
  const artistTimer = useRef<number | null>(null);

  const { data: chData } = useSWR(
    open && channel?.handle ? ['/getChannel', channel.handle] : null,
    () => channel?.handle ? api.getChannel({ handle: channel.handle }) : null,
  );
  const sets: ChannelSetSummary[] = (chData as any)?.sets ?? [];

  useEffect(() => {
    if (open && channel) {
      setDisplayName(channel.displayName ?? '');
      setNotes(channel.notes ?? '');
      setAccent(channel.accentColor || '#7A1F1F');
      setFeaturedSetId(channel.featuredSetId ?? null);
      setCoSigns(channel.coSigns ?? []);
      setArtistQuery('');
      setArtistResults([]);
      setError(null);
      setSetPage(0);
    }
  }, [open, channel]);

  useEffect(() => {
    if (artistTimer.current) window.clearTimeout(artistTimer.current);
    if (!artistQuery.trim()) {
      setArtistResults([]);
      return;
    }
    setSearchingArtists(true);
    artistTimer.current = window.setTimeout(async () => {
      try {
        const { artists } = await api.searchITunesArtists({ query: artistQuery, limit: 6 });
        setArtistResults(artists);
      } catch {
        setArtistResults([]);
      } finally {
        setSearchingArtists(false);
      }
    }, 350);
    return () => {
      if (artistTimer.current) window.clearTimeout(artistTimer.current);
    };
  }, [artistQuery]);

  const addCoSign = (a: CoSign) => {
    if (coSigns.some((c) => c.name === a.name)) return;
    if (coSigns.length >= 12) return;
    setCoSigns([...coSigns, a]);
  };
  const removeCoSign = (name: string) => setCoSigns(coSigns.filter((c) => c.name !== name));

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await api.updateChannel({
        displayName: displayName.trim() || undefined,
        notes: notes.trim() || null,
        accentColor: accent,
        featuredSetId,
        coSigns,
      });
      await refresh();
      close();
    } catch (err: any) {
      setError(err?.message ?? 'Signal lost. Retry.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!channel) return null;

  return (
    <Modal
      open={open}
      onClose={close}
      title="EDIT CHANNEL. ▪"
      width="wide"
      footer={
        <>
          <button className="btn-text" onClick={close}>CANCEL</button>
          <button className="btn btn-fill" onClick={submit} disabled={submitting} style={{ minWidth: 120 }}>
            {submitting ? <Spinner /> : 'SAVE'}
          </button>
        </>
      }
    >
      <div style={{ '--accent': accent } as React.CSSProperties}>
        <div className="form-row">
          <label className="mono-label">DISPLAY NAME</label>
          <input
            className="input-text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label className="mono-label">NOTES</label>
          <textarea
            className="input-textarea"
            placeholder="Your channel. What's on rotation, what's broadcasting, who you ride for."
            value={notes}
            maxLength={280}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <div className="form-row">
          <label className="mono-label">ACCENT</label>
          <AccentPicker value={accent} onChange={setAccent} />
        </div>

        <div className="form-row">
          <label className="mono-label">FEATURED SET</label>
          {featuredSetId && sets.find((s) => s.setId === featuredSetId) && (() => {
            const featured = sets.find((s) => s.setId === featuredSetId)!;
            return (
              <div style={{
                marginTop: 8,
                padding: '10px 14px',
                background: 'var(--ink)',
                color: 'var(--bone)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <div className="mono-label" style={{ color: 'var(--accent)', fontSize: 10, marginBottom: 2 }}>▪ FEATURED</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{featured.title}</div>
                </div>
                <button
                  type="button"
                  className="btn-text"
                  style={{ color: 'var(--mist)', fontFamily: 'var(--font-mono)', fontSize: 11 }}
                  onClick={() => setFeaturedSetId(null)}
                >
                  REMOVE
                </button>
              </div>
            );
          })()}
          {sets.length === 0 ? (
            <div className="mono-label smoke" style={{ marginTop: 8 }}>NO SETS FOUND.</div>
          ) : (
            <div style={{ marginTop: featuredSetId ? 4 : 8 }}>
              {sets.slice(setPage * 5, setPage * 5 + 5).map((s) => (
                <button
                  key={s.setId}
                  type="button"
                  onClick={() => setFeaturedSetId(s.setId === featuredSetId ? null : s.setId)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                    textAlign: 'left',
                    padding: '9px 12px',
                    marginBottom: 3,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    border: `1px solid ${s.setId === featuredSetId ? 'var(--ink)' : 'var(--mist)'}`,
                    background: s.setId === featuredSetId ? 'var(--paper)' : 'transparent',
                    cursor: 'pointer',
                    color: 'inherit',
                  }}
                >
                  <span>{s.title}</span>
                  {s.setId === featuredSetId && (
                    <span className="mono-label" style={{ fontSize: 10, color: 'var(--accent)' }}>SELECTED</span>
                  )}
                </button>
              ))}
              {sets.length > 5 && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                  <button
                    type="button"
                    className="btn btn-line"
                    style={{ padding: '4px 10px', fontSize: 11 }}
                    onClick={() => setSetPage((p) => Math.max(0, p - 1))}
                    disabled={setPage === 0}
                  >
                    ←
                  </button>
                  <span className="mono-label smoke" style={{ fontSize: 11 }}>
                    {setPage + 1} / {Math.ceil(sets.length / 5)}
                  </span>
                  <button
                    type="button"
                    className="btn btn-line"
                    style={{ padding: '4px 10px', fontSize: 11 }}
                    onClick={() => setSetPage((p) => Math.min(Math.ceil(sets.length / 5) - 1, p + 1))}
                    disabled={setPage >= Math.ceil(sets.length / 5) - 1}
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="form-row">
          <label className="mono-label">CO-SIGNS — UP TO 12</label>
          <input
            className="input-text"
            placeholder="Search an artist."
            value={artistQuery}
            onChange={(e) => setArtistQuery(e.target.value)}
            disabled={coSigns.length >= 12}
          />
          {searchingArtists && (
            <div className="mono-label smoke" style={{ marginTop: 8 }}>RECEIVING.</div>
          )}
          {artistResults.length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {artistResults.map((a) => (
                <button
                  key={a.name}
                  type="button"
                  className="btn btn-line"
                  onClick={() => addCoSign(a)}
                  disabled={coSigns.some((c) => c.name === a.name)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  {a.imageUrl && (
                    <img src={a.imageUrl} alt="" style={{ width: 20, height: 20, borderRadius: '50%' }} />
                  )}
                  {a.name}
                </button>
              ))}
            </div>
          )}
          {coSigns.length > 0 && (
            <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {coSigns.map((c) => (
                <span
                  key={c.name}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 10px',
                    background: 'var(--paper)',
                    border: '1px solid var(--ink)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                  }}
                >
                  {c.imageUrl && (
                    <img src={c.imageUrl} alt="" style={{ width: 20, height: 20, borderRadius: '50%' }} />
                  )}
                  {c.name}
                  <button
                    onClick={() => removeCoSign(c.name)}
                    aria-label="Remove"
                    style={{ display: 'inline-flex', padding: 0 }}
                  >
                    <IconX size={12} stroke={1.5} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="mono-label heat" style={{ marginTop: 16 }}>
            <span className="heat">▪</span> {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
