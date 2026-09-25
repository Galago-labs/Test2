import { useState } from 'react';
import { Check, LockKeyhole, X } from './Icons';
import { DECORATION_IDS, DECORATIONS, decorationProgress, nextDecoration, type DecorationId } from '../game/decorations';
import type { NapProgress } from '../game/progress';
import type { Translator } from '../i18n';
import { DecorationArt } from './DecorationArt';
import { ORIGINAL_ROOM_IMAGE } from '../game/artwork';

export function nextGiftText(progress: NapProgress, t: Translator) {
  const id = nextDecoration(progress.decorations);
  if (!id) return t('room.complete');
  const { current, goal } = decorationProgress(id, progress);
  return t('room.next', { item: t(`decor.${id}.name`), current, goal });
}

export function RoomView({ progress, t, onEquip, onClose }: { progress: NapProgress; t: Translator; onEquip: (id: DecorationId) => void; onClose: () => void }) {
  const [zoomedId, setZoomedId] = useState<DecorationId | null>(null);
  const favorites = DECORATION_IDS.filter((id) => progress.decorations[id] && progress.equipped[DECORATIONS[id].slot] === id);
  return <>
    <span className="eyebrow">{t('room.eyebrow')}</span>
    <h2 id="dialog-title">{t('room.title')}</h2>
    <p className="dialog-intro">{t('room.intro')}</p>
    <div className="room-preview"><img src={ORIGINAL_ROOM_IMAGE} alt={t('game.image')} draggable={false} /></div>
    {favorites.length > 0 && <div className="keepsake-display" role="group" aria-label={t('room.favorites')}>
      <span className="keepsake-heading">{t('room.favorites')}</span>
      <div className="keepsake-shelf">{favorites.map((id) => <span key={id} className={`keepsake-item ${zoomedId === id ? 'is-zoomed' : ''}`}>
        <button className="keepsake-art" onClick={() => setZoomedId(zoomedId === id ? null : id)} aria-pressed={zoomedId === id} aria-label={t(`decor.${id}.name`)} title={t(`decor.${id}.name`)}><DecorationArt id={id} /></button>
        <button className="keepsake-remove" onClick={() => { onEquip(id); setZoomedId(null); }} aria-label={`${t('room.remove')}: ${t(`decor.${id}.name`)}`}><X size={11} /></button>
      </span>)}</div>
    </div>}
    <div className="room-collection-heading"><span>{t('room.collected', { count: Object.keys(progress.decorations).length })}</span></div>
    <ul className="decoration-list">
      {DECORATION_IDS.map((id) => {
        const unlocked = Boolean(progress.decorations[id]);
        const selected = progress.equipped[DECORATIONS[id].slot] === id;
        const { current, goal } = decorationProgress(id, progress);
        return <li key={id} className={`decoration-row ${unlocked ? 'is-unlocked' : ''} ${selected ? 'is-equipped' : ''}`}>
          <DecorationArt id={id} className="decoration-thumbnail" />
          <div className="decoration-info"><h3>{t(`decor.${id}.name`)}</h3><p>{t(`decor.${id}.requirement`)}</p>
            {unlocked ? selected && <span className="equipped-label"><Check size={12} />{t('room.equipped')}</span> : <div className="decor-progress-row"><div className="decor-progress" role="progressbar" aria-label={t(`decor.${id}.name`)} aria-valuemin={0} aria-valuemax={goal} aria-valuenow={current}><span style={{ width: `${current / goal * 100}%` }} /></div><span>{t('room.progress', { current, goal })}</span></div>}
          </div>
          {unlocked ? <button className="small-action decor-action" aria-pressed={selected} aria-label={`${t(selected ? 'room.remove' : 'room.equip')}: ${t(`decor.${id}.name`)}`} onClick={() => onEquip(id)}>{t(selected ? 'room.remove' : 'room.equip')}</button> : <LockKeyhole className="decor-lock" size={15} aria-label={t('room.locked')} />}
        </li>;
      })}
    </ul>
    <p className="next-gift-note">{nextGiftText(progress, t)}</p>
    <button className="primary-button" onClick={onClose}><Check size={17} />{t('room.back')}</button>
  </>;
}