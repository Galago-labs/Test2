import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Download, Play, Settings2 } from '../Icons.tsx';
import { useDialog } from './DialogContext.tsx';

function MenuItem({ icon, label, hint, onClick, disabled = false }: { icon: ReactNode; label: string; hint?: string; onClick: () => void; disabled?: boolean }) {
  return <button className="menu-item" onClick={onClick} disabled={disabled}>
    {icon}
    <span className="menu-item-text"><strong>{label}</strong>{hint && <small>{hint}</small>}</span>
    <ArrowRight className="menu-item-arrow" size={16} />
  </button>;
}

export function MenuDialog() {
  const { t, close, open, saves, canExit } = useDialog();
  return <>
    <h2 id="dialog-title">{t('gameMenu.title')}</h2>
    <div className="menu-list">
      <MenuItem icon={<Play size={20} strokeWidth={1.6} />} label={t('gameMenu.continue')} onClick={close} />
      <MenuItem icon={<Download size={20} strokeWidth={1.6} />} label={t('gameMenu.load')} hint={saves.locked ? t('gameMenu.loadLocked') : undefined} disabled={saves.locked} onClick={() => open('saves')} />
      <MenuItem icon={<Settings2 size={20} strokeWidth={1.6} />} label={t('settings.open')} onClick={() => open('settings')} />
      {canExit && <MenuItem icon={<ArrowLeft size={20} strokeWidth={1.6} />} label={t('gameMenu.exit')} onClick={() => open('exitConfirm')} />}
    </div>
  </>;
}
