import { Menu } from './Icons.tsx';
import type { Translator } from '../i18n.ts';

// The "three bars" button that opens the game menu. One component, so it looks
// and is announced the same wherever it appears (start screen, HUD, results).
export function MenuButton({ t, onOpen, className = '' }: { t: Translator; onOpen: () => void; className?: string }) {
  return <button className={`round-button menu-button ${className}`} onClick={onOpen} aria-label={t('gameMenu.open')} title={t('gameMenu.open')}>
    <Menu size={22} strokeWidth={1.8} />
  </button>;
}
