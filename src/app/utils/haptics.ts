export type HapticPatternName =
  | 'selection'
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning';

const HAPTIC_PATTERNS: Record<HapticPatternName, number | number[]> = {
  selection: 6,
  light: 10,
  medium: 18,
  heavy: 28,
  success: [8, 32, 14],
  warning: [18, 28, 18],
};

const resolveHapticPattern = (name: string | undefined): number | number[] | null => {
  if (!name || name === 'off') return null;
  return HAPTIC_PATTERNS[name as HapticPatternName] ?? HAPTIC_PATTERNS.light;
};

export const playHaptic = (name: HapticPatternName = 'light') => {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return false;
  }

  try {
    return navigator.vibrate(HAPTIC_PATTERNS[name]);
  } catch {
    return false;
  }
};

export const installHapticFeedback = (root?: Document | HTMLElement) => {
  const targetRoot = root ?? (typeof document !== 'undefined' ? document : null);
  if (!targetRoot) return () => undefined;

  let lastFeedbackAt = 0;

  const handlePointerDown = (event: PointerEvent) => {
    if (event.defaultPrevented || event.button > 0) return;
    const target = event.target;
    if (!(target instanceof Element)) return;

    const hapticTarget = target.closest<HTMLElement>(
      '[data-haptic], button, [role="button"], a[href], input[type="checkbox"], input[type="radio"]',
    );
    if (!hapticTarget) return;
    if (hapticTarget.closest('[disabled], [aria-disabled="true"]')) return;

    const now = window.performance.now();
    if (now - lastFeedbackAt < 35) return;

    const pattern = resolveHapticPattern(hapticTarget.dataset.haptic ?? 'light');
    if (!pattern || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
      return;
    }

    try {
      navigator.vibrate(pattern);
      lastFeedbackAt = now;
    } catch {
      // Unsupported browsers should stay silent.
    }
  };

  targetRoot.addEventListener('pointerdown', handlePointerDown, { passive: true });

  return () => {
    targetRoot.removeEventListener('pointerdown', handlePointerDown);
  };
};
