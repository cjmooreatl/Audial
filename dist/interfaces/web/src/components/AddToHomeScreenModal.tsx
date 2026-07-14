import { useEffect, useRef, useState } from 'react';
import { IconShare2, IconSquarePlus, IconDots } from '@tabler/icons-react';
import { Modal } from './Modal';

const DISMISSED_KEY = 'audial_a2hs_dismissed';
const MOBILE_BREAKPOINT = '(max-width: 899px)';

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

// Android/Chromium fire beforeinstallprompt when the site qualifies as an
// installable PWA (manifest + icons present) — that's a real "do it for the
// user" button. iOS Safari has no equivalent API at all; the only path is
// Share -> Add to Home Screen, done by the user's own hand, so that branch
// shows instructions instead of a button that would otherwise do nothing.
export function AddToHomeScreenModal() {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<'android' | 'ios' | null>(null);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return;
    if (isStandalone()) return;
    if (!window.matchMedia(MOBILE_BREAKPOINT).matches) return;

    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(ua);

    if (isIOS) {
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
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
            <span className="mono-label" style={{ flexShrink: 0 }}>1</span>
            <p className="caption" style={{ margin: 0 }}>
              Tap the <IconDots size={16} stroke={1.5} style={{ display: 'inline-block', verticalAlign: '-3px' }} /> button in the bottom right corner of Safari
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
            <span className="mono-label" style={{ flexShrink: 0 }}>2</span>
            <p className="caption" style={{ margin: 0 }}>
              Tap the <IconShare2 size={16} stroke={1.5} style={{ display: 'inline-block', verticalAlign: '-3px' }} /> "Share" button in the bottom right corner of Safari
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span className="mono-label" style={{ flexShrink: 0 }}>3</span>
            <p className="caption" style={{ margin: 0 }}>
              Scroll down and tap <IconSquarePlus size={16} stroke={1.5} style={{ display: 'inline-block', verticalAlign: '-3px' }} /> "Add to Home Screen"
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}
