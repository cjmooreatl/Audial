import { Modal } from './Modal';

interface Props {
  open: boolean;
  onClose: () => void;
}

// Placeholder sheet for the upcoming Spotify Connect feature. The full OAuth
// flow lives on the roadmap (see src/roadmap/spotify-connect.md). For now this
// is the entry point — it sets expectations and lets the owner know what
// connecting their account will unlock.
export function ConnectSpotifyModal({ open, onClose }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="01 / CONNECT SPOTIFY"
      footer={
        <button className="btn btn-line" onClick={onClose}>
          GOT IT
        </button>
      }
    >
      <div className="connect-spotify">
        <div className="connect-spotify-status">
          <span className="dot" />
          <span className="mono-meta">SIGNAL EN ROUTE.</span>
        </div>

        <h2 className="heading" style={{ marginTop: 16 }}>
          The premium layer is coming.
        </h2>

        <p className="caption" style={{ marginTop: 12, maxWidth: 460 }}>
          Audial is iTunes-native by default — every set plays a real 30-second
          preview, no login required. Connecting Spotify will layer full
          playback on top for Premium subscribers, plus access to your library
          and listening history. We're wiring it now.
        </p>

        <ul className="connect-spotify-list">
          <li>
            <span className="mono-label">A</span>
            <div>
              <div className="subhead">Full-length playback</div>
              <p className="caption">
                Tracks play end-to-end via the Spotify Web Playback SDK for
                Premium accounts. The On Air bar gets a real runtime.
              </p>
            </div>
          </li>
          <li>
            <span className="mono-label">B</span>
            <div>
              <div className="subhead">Your library, on Audial</div>
              <p className="caption">
                Browse your Spotify playlists by name and compile them into
                sets — no URL hunting.
              </p>
            </div>
          </li>
          <li>
            <span className="mono-label">C</span>
            <div>
              <div className="subhead">Listening history on your channel</div>
              <p className="caption">
                A live strip of what you've actually been spinning — your real
                taste, not just what you compiled.
              </p>
            </div>
          </li>
        </ul>

        <div className="connect-spotify-note mono-meta">
          You'll get a transmission when this lands. Until then, the iTunes
          rotation keeps spinning.
        </div>
      </div>
    </Modal>
  );
}
