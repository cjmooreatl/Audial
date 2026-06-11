import { useState } from 'react';
import { Modal } from './Modal';
import { Spinner } from './Spinner';
import { useAuth } from '../store/auth';
import { useUI } from '../store/ui';
import { startSpotifyOAuth, disconnectSpotify } from '../lib/spotify';

export function ConnectSpotifyModal() {
  const open = useUI((s) => s.connectSpotifyOpen);
  const onClose = useUI((s) => s.closeConnectSpotify);
  const channel = useAuth((s) => s.channel);
  const refreshAuth = useAuth((s) => s.refresh);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConnected = channel?.spotifyConnected ?? false;
  const isPremium = channel?.spotifyIsPremium ?? false;

  const handleConnect = async () => {
    setError(null);
    console.log('handleConnect fired, CLIENT_ID:', import.meta.env.VITE_SPOTIFY_CLIENT_ID);
    try {
      await startSpotifyOAuth();
    } catch (err: any) {
      console.error('startSpotifyOAuth error:', err);
      setError(err?.message ?? 'Could not start Spotify login.');
    }
  };

  const handleDisconnect = async () => {
    setError(null);
    setDisconnecting(true);
    try {
      await disconnectSpotify();
      await refreshAuth();
    } catch (err: any) {
      setError(err?.message ?? 'Disconnect failed.');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="01 / CONNECT SPOTIFY"
      footer={
        isConnected ? (
          <>
            <button className="btn-text" onClick={onClose}>DONE</button>
            <button
              className="btn btn-line"
              onClick={handleDisconnect}
              disabled={disconnecting}
              style={{ minWidth: 140 }}
            >
              {disconnecting ? <Spinner /> : 'DISCONNECT'}
            </button>
          </>
        ) : (
          <>
            <button className="btn-text" onClick={onClose}>NOT NOW</button>
            <button
              className="btn btn-fill"
              onClick={handleConnect}
              style={{ minWidth: 180 }}
            >
              CONNECT SPOTIFY
            </button>
          </>
        )
      }
    >
      {isConnected ? (
        <div className="connect-spotify">
          <div className="connect-spotify-status">
            <span className="dot active" />
            <span className="mono-meta">SPOTIFY CONNECTED.</span>
          </div>
          <h2 className="heading" style={{ marginTop: 16 }}>
            {isPremium ? 'Premium. Tuned in.' : 'Connected.'}
          </h2>
          <p className="caption" style={{ marginTop: 12, maxWidth: 460 }}>
            {isPremium
              ? 'Your Spotify Premium account is connected. Browse your library and import playlists directly from the Share a Set modal.'
              : 'Your Spotify account is connected. Browse your library and import playlists from the Share a Set modal. Upgrade to Premium for full-length playback.'}
          </p>
          {error && (
            <div className="mono-label heat" style={{ marginTop: 16 }}>
              <span className="heat">▪</span> {error}
            </div>
          )}
        </div>
      ) : (
        <div className="connect-spotify">
          <div className="connect-spotify-status">
            <span className="dot" />
            <span className="mono-meta">NOT CONNECTED.</span>
          </div>
          <h2 className="heading" style={{ marginTop: 16 }}>Layer in Spotify.</h2>
          <p className="caption" style={{ marginTop: 12, maxWidth: 460 }}>
            Audial is iTunes-native — every set plays a real 30-second preview, no login required.
            Connecting Spotify unlocks your library for direct playlist import.
          </p>
          <ul className="connect-spotify-list">
            <li>
              <span className="mono-label">A</span>
              <div>
                <div className="subhead">Browse your library</div>
                <p className="caption">
                  Import directly from your Spotify playlists — no URL hunting, no copy-paste.
                </p>
              </div>
            </li>
            <li>
              <span className="mono-label">B</span>
              <div>
                <div className="subhead">Full-length playback</div>
                <p className="caption">
                  Premium subscribers get end-to-end playback via the Spotify Web Playback SDK.
                </p>
              </div>
            </li>
          </ul>
        </div>
      )}
    </Modal>
  );
}
