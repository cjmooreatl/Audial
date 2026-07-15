import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Spinner } from './Spinner';
import { useUI } from '../store/ui';
import { searchArtists, type ITunesArtist } from '../lib/itunes';
import { ONBOARDING_DISMISSED_KEY, isAddToHomeScreenPending } from '../lib/onboardingFlow';

// A handful of well-known, genre-spanning artists — just to show what a
// co-signs strip looks like with real circular artist art, reusing the exact
// markup/CSS from the real channel page (.cosign-strip / .cosign).
const COSIGN_DEMO_ARTISTS = [
  'Kendrick Lamar',
  'Taylor Swift',
  'SZA',
  'Bad Bunny',
  'Tyler, The Creator',
  'Burna Boy',
  'Fred again..',
  'Zach Bryan',
];

function CosignShowcase() {
  const [artists, setArtists] = useState<ITunesArtist[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      COSIGN_DEMO_ARTISTS.map((name) => searchArtists(name, 1).then((r) => r[0]).catch(() => null)),
    ).then((results) => {
      if (!cancelled) setArtists(results.filter((a): a is ITunesArtist => !!a));
    });
    return () => { cancelled = true; };
  }, []);

  if (!artists) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
        <Spinner />
      </div>
    );
  }

  return (
    <div className="cosign-strip">
      {artists.map((a) => (
        <div key={a.itunesArtistId} className="cosign">
          {a.imageUrl ? (
            <img src={a.imageUrl} alt={a.name} />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--mist)' }} />
          )}
          <span>{a.name}</span>
        </div>
      ))}
    </div>
  );
}

interface Slide {
  header: string;
  body: string;
  visual:
    | { type: 'image'; src: string; framed: boolean }
    | { type: 'cosigns' };
}

// Draft copy — meant to be edited directly, not final.
const SLIDES: Slide[] = [
  {
    header: 'THE HOME PAGE',
    visual: { type: 'image', src: '/home-img.png', framed: true },
    body: "Your feed of sets from people you're tuned into, plus what's trending across Audial. Switch between Subscribed, On Rotation, Heavy Rotation, and Drift to find your next listen.",
  },
  {
    header: 'YOUR CHANNEL',
    visual: { type: 'cosigns' },
    body: 'Every user has a channel — your home base. Highlight your favorite set, show your co-signs (favorite artists), write your notes, and link out to your Spotify, Apple Music, Instagram, or X.',
  },
  {
    header: 'SETS & SUBSCRIBERS',
    visual: { type: 'image', src: '/set-img.png', framed: false },
    body: 'Compile sets from any track you find, share them from your channel, and let people subscribe to tune into everything you broadcast next.',
  },
  {
    header: 'SEARCH & THE WIRE',
    visual: { type: 'image', src: '/wire-img.png', framed: false },
    body: "Search for artists, channels, or sets directly. Or just drift — The Wire auto-plays tracks from across Audial so you can discover without searching at all.",
  },
];

export function OnboardingModal() {
  const open = useUI((s) => s.onboardingOpen);
  const openOnboarding = useUI((s) => s.openOnboarding);
  const closeOnboarding = useUI((s) => s.closeOnboarding);
  const [step, setStep] = useState(0);

  // Auto-show once on first visit — but if the add-to-home-screen modal is
  // still eligible to show this visit, defer to it; its own dismiss() chains
  // into opening this instead, so the two never stack on a fresh mobile
  // visit.
  useEffect(() => {
    if (localStorage.getItem(ONBOARDING_DISMISSED_KEY)) return;
    if (isAddToHomeScreenPending()) return;
    openOnboarding();
  }, [openOnboarding]);

  const dismiss = () => {
    closeOnboarding();
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, '1');
  };

  // Reset to the first slide each time it opens, so reopening from the menu
  // after finishing it once doesn't resume mid-way through.
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  return (
    <Modal
      open={open}
      onClose={dismiss}
      title="ONBOARDING. ▪"
      footer={
        <>
          {step > 0 && (
            <button className="btn-text" onClick={() => setStep(step - 1)}>← BACK</button>
          )}
          <button
            className="btn btn-fill"
            onClick={isLast ? dismiss : () => setStep(step + 1)}
            style={{ minWidth: 120 }}
          >
            {isLast ? 'GOT IT' : 'NEXT'}
          </button>
        </>
      }
    >
      <div className="mono-label" style={{ marginBottom: 16 }}>{slide.header}</div>

      {slide.visual.type === 'cosigns' ? (
        <div style={{ marginBottom: 16 }}>
          <CosignShowcase />
        </div>
      ) : (
        <img
          src={slide.visual.src}
          alt={slide.header}
          style={{
            width: '100%',
            maxHeight: 320,
            objectFit: 'contain',
            marginBottom: 16,
            ...(slide.visual.framed
              ? { border: '1px solid var(--mist)', background: 'var(--paper)' }
              : { background: 'transparent' }),
          }}
        />
      )}

      <p className="caption">{slide.body}</p>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
        {SLIDES.map((_, i) => (
          <span
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: i <= step ? 'var(--ink)' : 'var(--mist)',
              transition: 'background 150ms ease',
            }}
          />
        ))}
      </div>
    </Modal>
  );
}
