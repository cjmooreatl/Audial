import { useEffect, useRef, useState } from 'react';
import { mutate } from 'swr';
import {
  IconBrandSpotify,
  IconBrandApple,
  IconBrandInstagram,
  IconBrandX,
  IconX,
} from '@tabler/icons-react';
import { Modal } from './Modal';
import { Spinner } from './Spinner';
import { useUI } from '../store/ui';
import { useAuth } from '../store/auth';
import api from '../api';

function validateUrl(value: string, hosts: string[], label: string): string | null {
  if (!value.trim()) return null;
  try {
    const parsed = new URL(value.trim());
    if (!hosts.some((host) => parsed.hostname.endsWith(host))) return `That doesn't look like a ${label} link.`;
    return null;
  } catch {
    return `That doesn't look like a valid URL.`;
  }
}

// A saved link renders as a locked chip (icon + URL + remove); an unsaved
// one renders as a plain input. "Locked" is its own state, set once from
// `initialValue` when the field mounts — NOT derived from the current typed
// value. Deriving it from the value directly (the previous approach) meant
// the field flipped into chip mode after the very first keystroke, since
// any non-empty string looked "saved" — killing typing entirely and only
// appearing to work for paste, where the whole URL landed before the flip.
// Hitting the remove button unlocks it for a fresh entry; saving and
// reopening the modal (which remounts this via a fresh `key`) is what
// re-locks it once there's a persisted value again.
function LinkField({
  icon: Icon,
  label,
  placeholder,
  initialValue,
  onChange,
}: {
  icon: typeof IconBrandSpotify;
  label: string;
  placeholder: string;
  initialValue: string;
  onChange: (v: string) => void;
}) {
  const [locked, setLocked] = useState(!!initialValue);
  const [draft, setDraft] = useState(initialValue);

  const setDraftAndNotify = (v: string) => {
    setDraft(v);
    onChange(v);
  };

  return (
    <div className="form-row" style={{ marginTop: 20 }}>
      <label className="mono-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Icon size={14} stroke={1.5} /> {label}
      </label>
      {locked ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginTop: 8,
            padding: '8px 10px',
            background: 'var(--paper)',
            border: '1px solid var(--ink)',
          }}
        >
          <a
            href={draft}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flex: 1,
              minWidth: 0,
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
            }}
          >
            <Icon size={16} stroke={1.5} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{draft}</span>
          </a>
          <button
            type="button"
            onClick={() => {
              setLocked(false);
              setDraftAndNotify('');
            }}
            aria-label={`Remove ${label.toLowerCase()}`}
            style={{ display: 'inline-flex', padding: 0, flexShrink: 0 }}
          >
            <IconX size={14} stroke={1.5} />
          </button>
        </div>
      ) : (
        <input
          className="input-text"
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraftAndNotify(e.target.value)}
          style={{ fontFamily: 'var(--font-mono)' }}
        />
      )}
    </div>
  );
}

// Lets a channel owner attach links to their real Spotify, Apple Music,
// Instagram, and X profiles — no OAuth, no SDK, just outbound links so
// visitors can browse their full library or follow them on those platforms.
export function LinksModal() {
  const open = useUI((s) => s.linksOpen);
  const close = useUI((s) => s.closeLinks);
  const channel = useAuth((s) => s.channel);
  const refresh = useAuth((s) => s.refresh);

  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [appleMusicUrl, setAppleMusicUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [xUrl, setXUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bumped only on the modal's actual open transition — passed to each
  // LinkField as part of its `key` so it remounts with fresh saved values
  // exactly once per open, instead of resetting mid-edit on unrelated
  // re-renders (e.g. a tab-focus-triggered auth refresh creating a new
  // `channel` object reference while the modal stays open).
  const [resetGen, setResetGen] = useState(0);

  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && !wasOpenRef.current && channel) {
      setSpotifyUrl(channel.spotifyProfileUrl ?? '');
      setAppleMusicUrl(channel.appleMusicProfileUrl ?? '');
      setInstagramUrl(channel.instagramUrl ?? '');
      setXUrl(channel.xUrl ?? '');
      setError(null);
      setResetGen((g) => g + 1);
    }
    wasOpenRef.current = open;
  }, [open, channel]);

  const submit = async () => {
    const err =
      validateUrl(spotifyUrl, ['spotify.com'], 'Spotify') ??
      validateUrl(appleMusicUrl, ['music.apple.com'], 'Apple Music') ??
      validateUrl(instagramUrl, ['instagram.com'], 'Instagram') ??
      validateUrl(xUrl, ['x.com', 'twitter.com'], 'X');
    if (err) { setError(err); return; }

    setError(null);
    setSubmitting(true);
    try {
      await api.updateChannel({
        spotifyProfileUrl: spotifyUrl.trim() || null,
        appleMusicProfileUrl: appleMusicUrl.trim() || null,
        instagramUrl: instagramUrl.trim() || null,
        xUrl: xUrl.trim() || null,
      });
      await refresh();
      // The Channel page caches its own copy of this data under ['channel', handle] —
      // refresh() only updates the auth store, so revalidate that cache directly or
      // the page keeps showing whatever was there when it first loaded.
      if (channel?.handle) await mutate(['channel', channel.handle]);
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
      title="LINKS. ▪"
      footer={
        <>
          <button className="btn-text" onClick={close}>CANCEL</button>
          <button className="btn btn-fill" onClick={submit} disabled={submitting} style={{ minWidth: 120 }}>
            {submitting ? <Spinner /> : 'SAVE'}
          </button>
        </>
      }
    >
      <p className="caption smoke" style={{ marginBottom: 8, maxWidth: 460 }}>
        Link your real profiles so visitors to your channel can browse your full library and follow you
        elsewhere.
      </p>

      <LinkField
        key={`spotify-${resetGen}`}
        icon={IconBrandSpotify}
        label="SPOTIFY PROFILE URL"
        placeholder="https://open.spotify.com/user/..."
        initialValue={spotifyUrl}
        onChange={setSpotifyUrl}
      />
      <LinkField
        key={`apple-${resetGen}`}
        icon={IconBrandApple}
        label="APPLE MUSIC PROFILE URL"
        placeholder="https://music.apple.com/profile/..."
        initialValue={appleMusicUrl}
        onChange={setAppleMusicUrl}
      />
      <LinkField
        key={`instagram-${resetGen}`}
        icon={IconBrandInstagram}
        label="INSTAGRAM URL"
        placeholder="https://instagram.com/..."
        initialValue={instagramUrl}
        onChange={setInstagramUrl}
      />
      <LinkField
        key={`x-${resetGen}`}
        icon={IconBrandX}
        label="X URL"
        placeholder="https://x.com/..."
        initialValue={xUrl}
        onChange={setXUrl}
      />

      {error && (
        <div className="mono-label heat" style={{ marginTop: 16 }}>
          <span className="heat">▪</span> {error}
        </div>
      )}
    </Modal>
  );
}
