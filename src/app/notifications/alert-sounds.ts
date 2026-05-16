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
    label: 'נעים',
    tones: [
      { frequency: 659.25, duration: 0.1, gain: 0.18 },
      { frequency: 880, duration: 0.14, gain: 0.14 },
    ],
  },
  {
    id: 'ping',
    label: 'נקישה',
    tones: [
      { frequency: 1174.66, duration: 0.055, gain: 0.18 },
      { frequency: 0, duration: 0.035, gain: 0 },
      { frequency: 880, duration: 0.07, gain: 0.1 },
    ],
  },
  {
    id: 'pulse',
    label: 'כפול',
    tones: [
      { frequency: 783.99, duration: 0.075, gain: 0.15 },
      { frequency: 0, duration: 0.045, gain: 0 },
      { frequency: 783.99, duration: 0.075, gain: 0.13 },
    ],
  },
  {
    id: 'rise',
    label: 'עלייה',
    tones: [
      { frequency: 493.88, duration: 0.07, gain: 0.12 },
      { frequency: 659.25, duration: 0.08, gain: 0.14 },
      { frequency: 880, duration: 0.11, gain: 0.13 },
    ],
  },
  {
    id: 'soft',
    label: 'עמוק',
    tones: [
      { frequency: 392, duration: 0.13, gain: 0.17 },
      { frequency: 587.33, duration: 0.15, gain: 0.12 },
    ],
  },
  {
    id: 'clear',
    label: 'בהיר',
    tones: [
      { frequency: 987.77, duration: 0.06, gain: 0.14 },
      { frequency: 1318.51, duration: 0.1, gain: 0.1 },
    ],
  },
  {
    id: 'bell',
    label: 'פעמונית',
    tones: [
      { frequency: 523.25, duration: 0.08, gain: 0.12 },
      { frequency: 783.99, duration: 0.1, gain: 0.12 },
      { frequency: 1046.5, duration: 0.16, gain: 0.09 },
    ],
  },
  {
    id: 'snap',
    label: 'קצר',
    tones: [
      { frequency: 1244.51, duration: 0.045, gain: 0.16 },
      { frequency: 0, duration: 0.035, gain: 0 },
      { frequency: 1046.5, duration: 0.045, gain: 0.1 },
    ],
  },
  {
    id: 'chime',
    label: 'זכוכית',
    tones: [
      { frequency: 1046.5, duration: 0.08, gain: 0.1 },
      { frequency: 1567.98, duration: 0.16, gain: 0.08 },
    ],
  },
  {
    id: 'urgent',
    label: 'ערני',
    tones: [
      { frequency: 880, duration: 0.055, gain: 0.15 },
      { frequency: 0, duration: 0.04, gain: 0 },
      { frequency: 1174.66, duration: 0.085, gain: 0.12 },
      { frequency: 0, duration: 0.04, gain: 0 },
      { frequency: 880, duration: 0.07, gain: 0.1 },
    ],
  },
] as const satisfies readonly AlertSoundPreset[];

export type AlertSoundId = (typeof ALERT_SOUND_PRESETS)[number]['id'];

export const DEFAULT_ALERT_SOUND_ID: AlertSoundId = 'sendi';

export const getAlertSoundPreset = (id: string | null | undefined) =>
  ALERT_SOUND_PRESETS.find((preset) => preset.id === id) ??
  ALERT_SOUND_PRESETS[0];
