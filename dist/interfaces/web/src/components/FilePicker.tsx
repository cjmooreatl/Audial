import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { IconPlus } from '@tabler/icons-react';
import api, { type ChannelSetSummary, type TrackSnapshot } from '../api';
import { CoverArt } from './CoverArt';
import { useAuth } from '../store/auth';
import { useUI } from '../store/ui';

interface Props {
  track: TrackSnapshot;
  onClose: () => void;
  onFiled?: (setTitle: string) => void;
  anchor?: 'on-air-bar' | 'inline';
}

// Inline picker: list of the user's sets + COMPILE NEW SET option.
// Used by both the On Air bar and search-result rows.
export function FilePicker({ track, onClose, onFiled, anchor = 'on-air-bar' }: Props) {
  const channel = useAuth((s) => s.channel);
  const openCompile = useUI((s) => s.openCompile);
  const [filing, setFiling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data } = useSWR(
    channel ? ['/myChannel', channel.handle] : null,
    () => channel?.handle ? api.getChannel({ handle: channel.handle }) : null,
  );
  const sets: ChannelSetSummary[] = (data as any)?.sets ?? [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleFile = async (set: ChannelSetSummary) => {
    setFiling(set.setId);
    setError(null);
    try {
      await api.fileTrack({ setId: set.setId, track });
      onFiled?.(set.title);
    } catch (err: any) {
      setError(err?.message ?? 'Signal lost. Retry.');
    } finally {
      setFiling(null);
    }
  };

  return (
    <div
      className={`file-picker ${anchor === 'inline' ? 'inline' : 'on-air'}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="fp-head mono-label">
        <span className="accent">▪</span> FILE TO
      </div>
      <button
        className="fp-row fp-compile"
        onClick={() => {
          openCompile(track);
          onClose();
        }}
      >
        <IconPlus size={16} stroke={1.5} />
        <span className="mono-label" style={{ color: 'var(--ink)' }}>
          COMPILE NEW SET
        </span>
      </button>
      <div className="fp-list">
        {sets.length === 0 && (
          <div className="caption smoke" style={{ padding: 16, textAlign: 'center' }}>
            No compiled sets yet.
          </div>
        )}
        {sets.map((s) => (
          <button
            key={s.setId}
            className="fp-row"
            onClick={() => handleFile(s)}
            disabled={!!filing}
          >
            <CoverArt url={s.coverUrl} size={120} hover={false} style={{ width: 32, height: 32 }} />
            <span className="fp-title">{s.title}</span>
            <span className="mono-meta smoke">
              {filing === s.setId ? 'FILING.' : `${s.trackCount} CUTS`}
            </span>
          </button>
        ))}
      </div>
      {error && (
        <div className="mono-label" style={{ padding: 12, color: 'var(--heat)' }}>
          {error}
        </div>
      )}
    </div>
  );
}
