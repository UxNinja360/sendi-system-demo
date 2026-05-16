export type AlertSoundTone = {
  duration: number;
  frequency: number;
  gain: number;
};

export type AlertSoundPreset = {
  id: string;
  label: string;
  tones: AlertSoundTone[];
};

export const ALERT_SOUND_PRESETS = [
  {
    id: 'sendi',
    label: 'סנדי',
    tones: [
      { frequency: 880, duration: 0.12, gain: 0.28 },
      { frequency: 1174.66, duration: 0.16, gain: 0.24 },
    ],
  },
  {
    id: 'ping',
    label: 'פינג',
    tones: [
      { frequency: 988, duration: 0.1, gain: 0.26 },
      { frequency: 0, duration: 0.04, gain: 0 },
      { frequency: 1318.51, duration: 0.12, gain: 0.22 },
    ],
  },
  {
    id: 'pulse',
    label: 'פולס',
    tones: [
      { frequency: 740, duration: 0.09, gain: 0.27 },
      { frequency: 0, duration: 0.045, gain: 0 },
      { frequency: 740, duration: 0.09, gain: 0.22 },
    ],
  },
  {
    id: 'rise',
    label: 'עולה',
    tones: [
      { frequency: 659.25, duration: 0.08, gain: 0.2 },
      { frequency: 830.61, duration: 0.08, gain: 0.22 },
      { frequency: 1046.5, duration: 0.12, gain: 0.22 },
    ],
  },
  {
    id: 'soft',
    label: 'רך',
    tones: [
      { frequency: 523.25, duration: 0.14, gain: 0.18 },
      { frequency: 783.99, duration: 0.18, gain: 0.16 },
    ],
  },
  {
    id: 'clear',
    label: 'נקי',
    tones: [
      { frequency: 1046.5, duration: 0.08, gain: 0.24 },
      { frequency: 0, duration: 0.035, gain: 0 },
      { frequency: 1046.5, duration: 0.08, gain: 0.2 },
      { frequency: 0, duration: 0.035, gain: 0 },
      { frequency: 1396.91, duration: 0.1, gain: 0.18 },
    ],
  },
  {
    id: 'bell',
    label: 'פעמון',
    tones: [
      { frequency: 784, duration: 0.1, gain: 0.22 },
      { frequency: 987.77, duration: 0.1, gain: 0.2 },
      { frequency: 1567.98, duration: 0.18, gain: 0.14 },
    ],
  },
  {
    id: 'snap',
    label: 'סנאפ',
    tones: [
      { frequency: 1480, duration: 0.055, gain: 0.28 },
      { frequency: 0, duration: 0.045, gain: 0 },
      { frequency: 980, duration: 0.07, gain: 0.18 },
    ],
  },
  {
    id: 'chime',
    label: 'צ׳יים',
    tones: [
      { frequency: 587.33, duration: 0.09, gain: 0.18 },
      { frequency: 880, duration: 0.12, gain: 0.19 },
      { frequency: 1174.66, duration: 0.14, gain: 0.17 },
    ],
  },
  {
    id: 'urgent',
    label: 'דחוף',
    tones: [
      { frequency: 932.33, duration: 0.08, gain: 0.28 },
      { frequency: 0, duration: 0.04, gain: 0 },
      { frequency: 932.33, duration: 0.08, gain: 0.25 },
      { frequency: 0, duration: 0.04, gain: 0 },
      { frequency: 1244.51, duration: 0.12, gain: 0.22 },
    ],
  },
] as const satisfies readonly AlertSoundPreset[];

export type AlertSoundId = (typeof ALERT_SOUND_PRESETS)[number]['id'];

export const DEFAULT_ALERT_SOUND_ID: AlertSoundId = 'sendi';

export const getAlertSoundPreset = (id: string | null | undefined) =>
  ALERT_SOUND_PRESETS.find((preset) => preset.id === id) ??
  ALERT_SOUND_PRESETS[0];
