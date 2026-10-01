import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Play } from '../Icons.tsx';
import { SoftButton } from '../SoftButton.tsx';
import { focusSafely } from '../../core/input.ts';
import { SCENARIO_DREAM_GOAL, SCENARIO_IDS } from '../../game/scenarios.ts';
import type { SaveSlot, SlotSummary } from '../../game/saveSlots.ts';
import { useDialog } from './DialogContext.tsx';

const exploredDreams = (progress: SlotSummary['progress']) =>
  SCENARIO_IDS.reduce((sum, scenario) => sum + Math.min(progress.scenarioWins[scenario], SCENARIO_DREAM_GOAL), 0);

export function SavesDialog() {
  const { t, saves, open } = useDialog();
  const [slots, setSlots] = useState(() => saves.list());
  const [confirming, setConfirming] = useState<SaveSlot | null>(null);
  const [failed, setFailed] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  // Where focus should land after the next render: a confirmation prompt, or back on a slot's own control.
  const nextFocus = useRef<string | null>(null);

  useEffect(() => {
    if (!nextFocus.current) return;
    focusSafely(root.current?.querySelector<HTMLElement>(nextFocus.current) ?? null);
    nextFocus.current = null;
  }, [confirming, slots]);

  const askToDelete = (slot: SaveSlot) => { nextFocus.current = '[data-keep]'; setFailed(false); setConfirming(slot); };
  const cancelDelete = (slot: SaveSlot) => { nextFocus.current = `[data-delete="${slot}"]`; setConfirming(null); };
  const confirmDelete = (slot: SaveSlot) => {
    const removed = saves.remove(slot);
    setFailed(!removed);
    nextFocus.current = removed ? `[data-primary="${slot}"]` : `[data-delete="${slot}"]`;
    setSlots(saves.list());
    setConfirming(null);
  };

  return <div ref={root}>
    <h2 id="dialog-title">{t('saves.title')}</h2>
    <p className="dialog-intro">{t('saves.intro')}</p>
    <ul className="save-list">
      {slots.map(({ slot, empty, progress }) => {
        const active = slot === saves.active;
        const current = exploredDreams(progress);
        return <li key={slot} className={`save-slot ${empty ? 'is-empty' : ''} ${active ? 'is-active' : ''}`}>
          <div className="save-slot-head">
            <h3>{t('saves.slot', { slot })}</h3>
            {active && <span className="save-badge">{t('saves.active')}</span>}
          </div>
          <p className="save-summary">{empty ? t('saves.emptyHint') : t('saves.summary', { wins: progress.wins, current, goal: SCENARIO_IDS.length * SCENARIO_DREAM_GOAL })}</p>
          {confirming === slot
            ? <div className="save-confirm" role="group" aria-labelledby={`save-confirm-${slot}`}>
                <strong id={`save-confirm-${slot}`}>{t('saves.confirmTitle', { slot })}</strong>
                <p>{t('saves.confirmBody')}</p>
                <div className="save-actions">
                  <button className="text-button" data-keep onClick={() => cancelDelete(slot)}>{t('saves.confirmNo')}</button>
                  <button className="text-button danger-button" onClick={() => confirmDelete(slot)}>{t('saves.confirmYes')}</button>
                </div>
              </div>
            : <div className="save-actions">
                <SoftButton className="save-primary" data-primary={slot} onClick={() => saves.select(slot)}>
                  {empty ? <Check size={17} /> : <Play size={17} />}{t(empty ? 'saves.new' : 'saves.continue')}
                </SoftButton>
                {!empty && <button className="text-button danger-button" data-delete={slot} aria-label={t('saves.deleteLabel', { slot })} onClick={() => askToDelete(slot)}>{t('saves.delete')}</button>}
              </div>}
        </li>;
      })}
    </ul>
    {failed && <p className="settings-message" role="alert">{t('saves.deleteFailed')}</p>}
    <button className="text-button" onClick={() => open('menu')}><ArrowLeft size={15} />{t('saves.back')}</button>
  </div>;
}
