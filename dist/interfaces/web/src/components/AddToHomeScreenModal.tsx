import { useEffect, useRef, useState, type ReactNode } from 'react';
import { IconShare2, IconSquarePlus, IconDots, IconExternalLink } from '@tabler/icons-react';
import { Modal } from './Modal';

const DISMISSED_KEY = 'audial_a2hs_dismissed';
const MOBILE_BREAKPOINT = '(max-width: 899px)';

const ICON_STYLE = { display: 'inline-block' as const, verticalAlign: '-3px' };

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  );
}

type IosBrowser = 'safari' | 'chrome';

// iOS forces every browser onto WebKit under the hood, so none of them get a
// real install API — Safari and Chrome both need the manual Share-sheet
// route, but the menus/icons involved differ enough between the two that
// the steps need separate copy per browser.
const IOS_STEPS: Record<IosBrowser, ReactNode[]> = {
  safari: [
    <>Tap the <IconDots size={16} stroke={1.5} style={ICON_STYLE} /> button in the bottom right corner of Safari</>,
    <>Select the <IconShare2 size={16} stroke={1.5} style={ICON_STYLE} /> "Share" button at the top of the list</>,
    <>Click "View More" and tap <IconSquarePlus size={16} stroke={1.5} style={ICON_STYLE} /> "Add to Home Screen"</>,
  ],
  // Placeholder — same steps as Safari until the real Chrome wording is filled in.
  chrome: [
    <>Tap the <IconShare2 size={16} stroke={1.5} style={ICON_STYLE} /> icon at the top right in the URL bar</>,
    <>Select "View More" in the bottom row</>,
    <>Scroll down and tap <IconSquarePlus size={16} stroke={1.5} style={ICON_STYLE} /> "Add to Home Screen"</>,
  ],
};

function StepList({ steps }: { steps: ReactNode[] }) {
  return (
    <div>
      {steps.map((step, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            marginBottom: i < steps.length - 1 ? 8 : 0,
          }}
        >
          <span className="mono-label" style={{ flexShrink: 0 }}>{i + 1}</span>
          <p className="caption" style={{ margin: 0 }}>{step}</p>
        </div>
      ))}
    </div>
  );
}

// Android/Chromium fire beforeinstallprompt when the site qualifies as an
// installable PWA (manifest + icons present) — that's a real "do it for the
// user" button. iOS Safari has no equivalent API at all; the only path is
// Share -> Add to Home Screen, done by the user's own hand, so that branch
// shows instructions instead of a button that would otherwise do nothing.
export function AddToHomeScreenModal() {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<'android' | 'ios' | null>(null);
  const [iosBrowser, setIosBrowser] = useState<IosBrowser>('safari');
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return;
    if (isStandalone()) return;
    if (!window.matchMedia(MOBILE_BREAKPOINT).matches) return;

    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(ua);

    if (isIOS) {
      setIosBrowser(/CriOS/i.test(ua) ? 'chrome' : 'safari');
      setPlatform('ios');
      setOpen(true);
      return;
    }

    if (!isAndroid) return;

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setPlatform('android');
      setOpen(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    setOpen(false);
    localStorage.setItem(DISMISSED_KEY, '1');
  };

  const handleInstall = async () => {
    const promptEvent = deferredPromptRef.current;
    if (!promptEvent) { dismiss(); return; }
    deferredPromptRef.current = null;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    dismiss();
  };

  if (!platform) return null;

  return (
    <Modal
      open={open}
      onClose={dismiss}
      title="TUNE IN FROM YOUR HOME SCREEN. ▪"
      footer={
        platform === 'android' ? (
          <>
            <button className="btn-text" onClick={dismiss}>NOT NOW</button>
            <button className="btn btn-fill" onClick={handleInstall} style={{ minWidth: 180 }}>
              ADD TO HOME SCREEN
            </button>
          </>
        ) : (
          <button className="btn btn-fill" onClick={dismiss} style={{ minWidth: 120 }}>
            GOT IT
          </button>
        )
      }
    >
      {platform === 'android' ? (
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <IconSquarePlus size={28} stroke={1.25} style={{ flexShrink: 0, marginTop: 2 }} />
          <p className="caption" style={{ maxWidth: 420 }}>
            Add Audial to your home screen for one-tap access — it opens full-screen, just like an app.
          </p>
        </div>
      ) : (
        <div>
          <p className="caption" style={{ maxWidth: 420, marginBottom: 16 }}>
            Add Audial to your home screen for one-tap access — it opens full-screen, just like an app.
            iOS doesn't let sites do this automatically, so:
          </p>
          <p className="mono-label" style={{ marginBottom: 16 }}>
            If viewing within Instagram, select <IconExternalLink size={16} stroke={1.5} style={ICON_STYLE} /> "Open in external browser" from <IconDots size={16} stroke={1.5} style={ICON_STYLE} /> in top right
          </p>

          <div style={{ display: 'flex', gap: 20, marginBottom: 16, borderBottom: '1px solid var(--mist)', paddingBottom: 12 }}>
            <button
              className={`btn-text mono-label ${iosBrowser === 'safari' ? '' : 'smoke'}`}
              onClick={() => setIosBrowser('safari')}
            >
              SAFARI
            </button>
            <button
              className={`btn-text mono-label ${iosBrowser === 'chrome' ? '' : 'smoke'}`}
              onClick={() => setIosBrowser('chrome')}
            >
              CHROME
            </button>
          </div>

          <StepList steps={IOS_STEPS[iosBrowser]} />
        </div>
      )}

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginTop: 20,
          paddingTop: 16,
          borderTop: '1px solid var(--mist)',
          cursor: 'pointer',
        }}
      >
        <input type="checkbox" onChange={(e) => { if (e.target.checked) dismiss(); }} />
        <span className="mono-label smoke">I've already added Audial to my home screen</span>
      </label>
    </Modal>
  );
}
