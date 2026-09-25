export const LOCALES = ['ru', 'en', 'es', 'ko', 'ja'] as const;
export type Locale = typeof LOCALES[number];
export const LANGUAGE_NAMES: Record<Locale, string> = { ru: 'Русский', en: 'English', es: 'Español', ko: '한국어', ja: '日本語' };
export const LOCALE_KEY = 'little-pause.language.v1';
export function isLocale(value: unknown): value is Locale { return typeof value === 'string' && (LOCALES as readonly string[]).includes(value); }
export function resolveLocale(language: unknown): Locale {
  const base = typeof language === 'string' ? language.trim().toLowerCase().split(/[-_]/)[0] : '';
  if (isLocale(base)) return base;
  return !base || ['be', 'kk', 'uk', 'uz'].includes(base) ? 'ru' : 'en';
}