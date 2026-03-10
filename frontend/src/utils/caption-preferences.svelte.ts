import { createLocalStore } from './local-storage.svelte'

export type CaptionFontFamily = 'sans-serif' | 'serif' | 'monospace'
export type CaptionFontSize =
  | 'smaller'
  | 'small'
  | 'default'
  | 'large'
  | 'larger'
export type CaptionBackground = 'dark' | 'darker' | 'solid'

export interface CaptionPreferences {
  fontFamily: CaptionFontFamily
  fontSize: CaptionFontSize
  backgroundColor: CaptionBackground
  showVoiceLabels: boolean
}

const DEFAULTS: CaptionPreferences = {
  fontFamily: 'sans-serif',
  fontSize: 'default',
  backgroundColor: 'dark',
  showVoiceLabels: true,
}

export const FONT_SIZE_MAP: Record<CaptionFontSize, string> = {
  smaller: '0.75rem',
  small: '0.875rem',
  default: '1rem',
  large: '1.25rem',
  larger: '1.5rem',
}

export const BACKGROUND_MAP: Record<CaptionBackground, string> = {
  dark: 'rgba(0, 0, 0, 0.7)',
  darker: 'rgba(0, 0, 0, 0.85)',
  solid: 'rgba(0, 0, 0, 1)',
}

export const captionPrefs = createLocalStore<CaptionPreferences>(
  'caption.preferences',
  DEFAULTS,
)

export const captionFollowing = createLocalStore<boolean>(
  'caption.following',
  false,
)
