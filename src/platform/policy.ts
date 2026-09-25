export { resolveLocale as resolvePlatformLanguage } from '../locales/registry.ts';
export type { Locale as SupportedLanguage } from '../locales/registry.ts';
export { fitGameStage } from '../game/viewport.ts';

export function wantsGameplay(status: string, modal: string | null, tutorialActive: boolean) {
  return modal === 'intro' ? tutorialActive : modal === null && status === 'playing';
}