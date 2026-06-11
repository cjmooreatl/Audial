import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { exchangeSpotifyCode, saveSpotifyTokens } from '../lib/spotify';
import { useAuth } from '../store/auth';

export function SpotifyCallback() {
  const [, navigate] = useLocation();
  const refreshAuth = useAuth((s) => s.refresh);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const errorParam = params.get('error');

    if (errorParam) {
      setStatus('error');
      setError(errorParam === 'access_denied' ? 'Spotify access was denied.' : 'Authorization failed.');
      return;
    }

    if (!code) {
      navigate('/');
      return;
    }

    exchangeSpotifyCode(code)
      .then((tokens) => saveSpotifyTokens(tokens))
      .then(() => refreshAuth())
      .then(() => {
        setStatus('success');
        setTimeout(() => navigate('/'), 1200);
      })
      .catch((err: any) => {
        setStatus('error');
        setError(err?.message ?? 'Connection failed.');
      });
  }, []);

  if (status === 'error') {
    return (
      <div className="container" style={{ padding: '96px 0' }}>
        <h2 className="heading">Connection failed.</h2>
        <p className="caption smoke" style={{ marginTop: 8 }}>{error}</p>
        <button className="btn-text" onClick={() => navigate('/')} style={{ marginTop: 16 }}>
          ← BACK
        </button>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="container" style={{ padding: '96px 0', textAlign: 'center' }}>
        <div className="mono-label">SPOTIFY CONNECTED. TUNING BACK IN.</div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '96px 0', textAlign: 'center' }}>
      <div className="mono-label smoke">CONNECTING SPOTIFY.</div>
    </div>
  );
}
