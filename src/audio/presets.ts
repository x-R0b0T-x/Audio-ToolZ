import type {
  CompressorAutoGainParams,
  EchoDelayParams,
  EqBandConfig,
  SpectralNoiseReductionParams,
} from './studioDsp';

export type EffectChainStep =
  | { kind: 'remove-dc' }
  | { kind: 'volume'; gainDb: number }
  | { kind: 'normalize'; targetPeakDb: number }
  | { kind: 'eq'; bands: EqBandConfig[] }
  | { kind: 'filter'; filterKind: 'lowpass' | 'highpass' | 'notch'; frequency: number; q?: number }
  | { kind: 'compressor'; params: CompressorAutoGainParams }
  | { kind: 'noise-reduction'; params: SpectralNoiseReductionParams }
  | { kind: 'echo'; params: EchoDelayParams };

export interface AudioEffectPreset {
  id: string;
  name: string;
  category: 'compressor' | 'eq' | 'filter' | 'noise-reduction' | 'echo' | 'chain';
  description: string;
  steps: EffectChainStep[];
  builtin?: boolean;
}

export const PRESET_STORAGE_KEY = 'audio_toolz_presets_v15';

export const DEFAULT_STUDIO_PRESETS: AudioEffectPreset[] = [
  {
    id: 'studio-autogain-voice',
    name: 'Auto Gain — Voix & Podcast',
    category: 'compressor',
    description: 'Compression douce (3.2:1) avec normalisation automatique à -1.0 dBFS.',
    builtin: true,
    steps: [
      { kind: 'remove-dc' },
      {
        kind: 'compressor',
        params: {
          thresholdDb: -22,
          ratio: 3.2,
          attackMs: 12,
          releaseMs: 140,
          autoGain: true,
          targetPeakDb: -1.0,
        },
      },
    ],
  },
  {
    id: 'studio-autogain-fast',
    name: 'Auto Gain — Mise à niveau rapide',
    category: 'compressor',
    description: 'Contrôle dynamique rapide pour homogénéiser un mix hétérogène.',
    builtin: true,
    steps: [
      {
        kind: 'compressor',
        params: {
          thresholdDb: -18,
          ratio: 4.5,
          attackMs: 5,
          releaseMs: 65,
          autoGain: true,
          targetPeakDb: -0.8,
        },
      },
    ],
  },
  {
    id: 'studio-eq-vocal-clarity',
    name: 'EQ — Clarté vocale + Coupe-bas 80 Hz',
    category: 'eq',
    description: 'Supprime le grondement sous 80 Hz et éclaire le médium/aigu.',
    builtin: true,
    steps: [
      { kind: 'filter', filterKind: 'highpass', frequency: 80, q: 0.707 },
      {
        kind: 'eq',
        bands: [
          { type: 'peaking', frequency: 260, gainDb: -2.0, q: 1.1 },
          { type: 'peaking', frequency: 3200, gainDb: 3.2, q: 1.0 },
          { type: 'highshelf', frequency: 8500, gainDb: 2.0, q: 0.7 },
        ],
      },
    ],
  },
  {
    id: 'studio-filter-hum-50hz',
    name: 'Filtre — Coupe-ronflette 50 Hz',
    category: 'filter',
    description: 'Filtre coupe-bande (Notch) ciblé sur le secteur 50 Hz.',
    builtin: true,
    steps: [{ kind: 'filter', filterKind: 'notch', frequency: 50, q: 8.0 }],
  },
  {
    id: 'studio-nr-soft',
    name: 'Réduction de bruit — Souffle léger',
    category: 'noise-reduction',
    description: 'Atténuation spectrale modérée (-14 dB) préservant les transitoires.',
    builtin: true,
    steps: [
      {
        kind: 'noise-reduction',
        params: { reductionDb: 14, sensitivity: 1.0, smoothing: 0.4 },
      },
    ],
  },
  {
    id: 'studio-echo-slapback',
    name: 'Écho — Slapback Studio (120 ms)',
    category: 'echo',
    description: 'Écho court avec feedback modéré pour voix ou guitare.',
    builtin: true,
    steps: [{ kind: 'echo', params: { delayMs: 120, feedback: 0.28, mix: 0.25 } }],
  },
];

export function serializePresetBank(presets: AudioEffectPreset[]): string {
  return JSON.stringify(
    {
      schema: 'audio-toolz.presets/v1.5',
      presets,
    },
    null,
    2
  );
}

export function parsePresetBank(rawJson: string): AudioEffectPreset[] {
  const parsed = JSON.parse(rawJson) as { presets?: unknown };
  if (!parsed || !Array.isArray(parsed.presets)) {
    throw new Error('Format de banque de presets invalide.');
  }
  return parsed.presets.filter(
    (item): item is AudioEffectPreset =>
      Boolean(item) &&
      typeof item === 'object' &&
      typeof (item as AudioEffectPreset).id === 'string' &&
      typeof (item as AudioEffectPreset).name === 'string' &&
      Array.isArray((item as AudioEffectPreset).steps)
  );
}

export function loadUserPresets(): AudioEffectPreset[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PRESET_STORAGE_KEY);
    if (!raw) return [];
    return parsePresetBank(raw);
  } catch {
    return [];
  }
}

export function saveUserPresets(presets: AudioEffectPreset[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(PRESET_STORAGE_KEY, serializePresetBank(presets));
  } catch {
    // Ignore quota errors
  }
}
