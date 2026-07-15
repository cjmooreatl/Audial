// Shared between AddToHomeScreenModal and OnboardingModal so the two never
// stack on a fresh mobile visit: the home-screen prompt shows first, and its
// own dismiss() chains into opening onboarding afterward. Kept in a neutral
// module (rather than importing directly between the two modals) to avoid a
// circular import.
import { useUI } from '../store/ui';

export const A2HS_DISMISSED_KEY = 'audial_a2hs_dismissed';
export const ONBOARDING_DISMISSED_KEY = 'audial_onboarding_dismissed';
export const MOBILE_BREAKPOINT = '(max-width: 899px)';

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  );
}

// True if the add-to-home-screen modal is still eligible to show this visit
// — used so the onboarding tour can defer to it instead of opening at the
// same time.
export function isAddToHomeScreenPending(): boolean {
  if (localStorage.getItem(A2HS_DISMISSED_KEY)) return false;
  if (isStandalone()) return false;
  if (!window.matchMedia(MOBILE_BREAKPOINT).matches) return false;
  return true;
}

// Called from the add-to-home-screen modal's dismiss() to hand off to
// onboarding — only opens it if the user hasn't already been through it.
export function maybeAutoOpenOnboarding(): void {
  if (localStorage.getItem(ONBOARDING_DISMISSED_KEY)) return;
  useUI.getState().openOnboarding();
}
