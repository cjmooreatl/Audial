import { useEffect, useRef, useState } from 'react';
import { IconArrowDown } from '@tabler/icons-react';
import { Spinner } from './Spinner';
import { isStandalone } from '../lib/onboardingFlow';

const THRESHOLD = 70;
const MAX_PULL = 100;

// Installed home-screen PWAs have no browser chrome — no reload button, and
// on iOS, no native pull-to-refresh gesture either — so there's otherwise no
// way to pick up a new deploy short of force-quitting the app. Only active
// in standalone mode; a normal browser tab already has its own refresh
// affordance.
export function PullToRefresh() {
  const [enabled] = useState(() => isStandalone());
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const distanceRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const onTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      // Ignore touches starting inside a modal — its own internal scroll
      // shouldn't be mistaken for a page-level pull (the main page is
      // scroll-locked behind an open modal, so window.scrollY reads 0 there
      // too, which would otherwise look identical to being at the top).
      if (target.closest('.modal-backdrop')) { startY.current = null; return; }
      if (window.scrollY > 0) { startY.current = null; return; }
      startY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY.current == null) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) {
        distanceRef.current = 0;
        setPullDistance(0);
        return;
      }
      e.preventDefault();
      const next = Math.min(delta * 0.5, MAX_PULL);
      distanceRef.current = next;
      setPullDistance(next);
    };

    const onTouchEnd = () => {
      if (startY.current == null) return;
      startY.current = null;
      if (distanceRef.current >= THRESHOLD) {
        setRefreshing(true);
        window.location.reload();
      } else {
        distanceRef.current = 0;
        setPullDistance(0);
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [enabled]);

  if (!enabled || (pullDistance === 0 && !refreshing)) return null;

  const pastThreshold = pullDistance >= THRESHOLD;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        height: 0,
        overflow: 'visible',
        zIndex: 200,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          marginTop: refreshing ? 16 : pullDistance - 40,
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'var(--bone)',
          border: '1px solid var(--ink)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: startY.current == null ? 'margin-top 0.2s ease' : 'none',
        }}
      >
        {refreshing ? (
          <Spinner size={16} />
        ) : (
          <IconArrowDown
            size={16}
            stroke={1.5}
            style={{
              color: pastThreshold ? 'var(--accent)' : 'var(--ink)',
              transform: `rotate(${pastThreshold ? 180 : 0}deg)`,
              transition: 'transform 0.15s ease, color 0.15s ease',
            }}
          />
        )}
      </div>
    </div>
  );
}
