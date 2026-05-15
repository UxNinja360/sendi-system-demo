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

type CapacitorHapticsModule = typeof import('@capacitor/haptics');
type CapacitorWindow = Window & {
  Capacitor?: {
    getPlatform?: () => string;
    isNativePlatform?: () => boolean;
  };
};

let capacitorHapticsPromise: Promise<CapacitorHapticsModule | null> | null = null;

const isCapacitorNativePlatform = () => {
  if (typeof window === 'undefined') return false;

  const capacitor = (window as CapacitorWindow).Capacitor;
  if (!capacitor) return false;
  if (typeof capacitor.isNativePlatform === 'function') {
    return capacitor.isNativePlatform();
  }

  return typeof capacitor.getPlatform === 'function' && capacitor.getPlatform() !== 'web';
};

const loadCapacitorHaptics = () => {
  capacitorHapticsPromise ??= import('@capacitor/haptics').catch(() => null);
  return capacitorHapticsPromise;
};

const playCapacitorHaptic = (name: string | undefined) => {
  if (!isCapacitorNativePlatform()) return false;

  void loadCapacitorHaptics().then((module) => {
    if (!module) return;

    const { Haptics, ImpactStyle, NotificationType } = module;

    if (name === 'success') {
      void Haptics.notification({ type: NotificationType.Success }).catch(() => undefined);
      return;
    }

    if (name === 'warning') {
      void Haptics.notification({ type: NotificationType.Warning }).catch(() => undefined);
      return;
    }

    const style =
      name === 'heavy'
        ? ImpactStyle.Heavy
        : name === 'medium'
          ? ImpactStyle.Medium
          : ImpactStyle.Light;

    void Haptics.impact({ style }).catch(() => undefined);
  });

  return true;
};

const isLikelyIOSTouchDevice = () => {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;

  const platform = navigator.platform ?? '';
  const userAgent = navigator.userAgent ?? '';
  const isIOS =
    /iPad|iPhone|iPod/.test(userAgent) ||
    (platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const hasCoarsePointer =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;

  return isIOS && hasCoarsePointer;
};

const triggerIOSSwitchTick = () => {
  if (typeof document === 'undefined') return false;

  try {
    const labelEl = document.createElement('label');
    labelEl.setAttribute('aria-hidden', 'true');
    labelEl.style.display = 'none';

    const inputEl = document.createElement('input');
    inputEl.type = 'checkbox';
    inputEl.setAttribute('switch', '');
    inputEl.tabIndex = -1;

    labelEl.appendChild(inputEl);
    document.head.appendChild(labelEl);
    labelEl.click();
    document.head.removeChild(labelEl);

    return true;
  } catch {
    return false;
  }
};

const getIOSSwitchTickCount = (name: string | undefined) => {
  if (name === 'warning' || name === 'heavy') return 3;
  if (name === 'success' || name === 'medium') return 2;
  return 1;
};

const playIOSSwitchHaptic = (name: string | undefined) => {
  if (!isLikelyIOSTouchDevice()) return false;

  const tickCount = getIOSSwitchTickCount(name);
  const played = triggerIOSSwitchTick();

  for (let index = 1; index < tickCount; index += 1) {
    window.setTimeout(triggerIOSSwitchTick, index * 90);
  }

  return played;
};

const playResolvedHaptic = (name: string | undefined) => {
  const pattern = resolveHapticPattern(name);
  if (!pattern) return false;

  if (playCapacitorHaptic(name)) return true;

  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      if (navigator.vibrate(pattern)) return true;
    } catch {
      // Fall through to the iOS switch fallback.
    }
  }

  return playIOSSwitchHaptic(name);
};

export const playHaptic = (name: HapticPatternName = 'light') => {
  return playResolvedHaptic(name);
};

export const installHapticFeedback = (root?: Document | HTMLElement) => {
  const targetRoot = root ?? (typeof document !== 'undefined' ? document : null);
  if (!targetRoot) return () => undefined;

  if (isCapacitorNativePlatform()) {
    void loadCapacitorHaptics();
  }

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

    const hapticName = hapticTarget.dataset.haptic ?? 'light';
    if (playResolvedHaptic(hapticName)) {
      lastFeedbackAt = now;
    }
  };

  targetRoot.addEventListener('pointerdown', handlePointerDown, { passive: true });

  return () => {
    targetRoot.removeEventListener('pointerdown', handlePointerDown);
  };
};
