import { useState } from 'react';
import { useLocation } from 'wouter';
import { Modal } from './Modal';
import { Spinner } from './Spinner';
import api from '../api';
import { useUI } from '../store/ui';
import { useAuth } from '../store/auth';

export function ShareSetModal() {
  const open = useUI((s) => s.shareOpen);
  const close = useUI((s) => s.closeShare);
  const refreshAuth = useAuth((s) => s.refresh);
  const [, navigate] = useLocation();
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
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
      const msg = err?.message ?? 'Signal lost. Retry.';
      if (err?.code === 'spotify_not_configured' || msg.includes('SPOTIFY_CLIENT')) {
        setError('Spotify import is unavailable. The platform admin needs to configure Spotify credentials.');
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

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
            onClick={submit}
            disabled={!url.trim() || submitting}
            style={{ minWidth: 120 }}
          >
            {submitting ? <Spinner /> : 'SHARE'}
          </button>
        </>
      }
    >
      <input
        className="input-text"
        placeholder="Paste a Spotify playlist URL."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter' && url.trim()) submit();
        }}
        style={{ fontFamily: 'var(--font-mono)' }}
      />
      <p className="caption smoke" style={{ marginTop: 12, maxWidth: 460 }}>
        We'll resolve the source on Spotify and compile a snapshot into your channel. Previews come from Apple's catalogue where available.
      </p>
      {error && (
        <div className="mono-label heat" style={{ marginTop: 16 }}>
          <span className="heat">▪</span> {error}
        </div>
      )}
    </Modal>
  );
}
