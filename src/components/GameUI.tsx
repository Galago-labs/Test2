import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useIsPresent } from 'motion/react';
import { ArrowRight, BookOpen, Check, CircleHelp, Clock3, Globe2, Heart, House, Maximize2, Settings2, Volume2, X } from './Icons';
import { DreamCloud, MapleLeaf, MoonMark } from './NapArt';
import { NapTutorial } from './NapTutorial';
import { ACHIEVEMENTS, type NapProgress } from '../game/useNapProgress';
import { formatDate, LANGUAGE_NAMES, LOCALES, isLocale, type Locale, type Translator } from '../i18n';
import { MOODS, type Mood } from '../game/engine';
import type { SaveStatus } from '../game/progress';
import { focusSafely } from '../core/input';
import { RoomView } from './RoomView';
import { SCENARIO_IDS } from '../game/scenarios';
import type { DecorationId } from '../game/decorations';
import { TrophyArt } from './TrophyArt';
import { AssetDownloads } from './AssetDownloads';

export type { ModalKind } from '../game/dialogState';
import type { ModalKind } from '../game/dialogState';

export function SoftButton({ children, onClick, className = '' }: { children: ReactNode; onClick: () => void; className?: string }) {
  return <motion.button className={`primary-button ${className}`} onClick={onClick} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.18 }}>{children}</motion.button>;
}

interface DialogProps {
  kind: Exclude<ModalKind, null>;
  onClose: () => void;
  returnFocus: HTMLElement | null;
  locale: Locale;
  t: Translator;
  progress: NapProgress;
  storageAvailable: boolean;
  saveStatus: SaveStatus;
  onPractice: () => void;
  onFinishTutorial: () => void;
  tutorialReturning: boolean;
  suspended: boolean;
  onTutorialActivity: (active: boolean) => void;
  onOpen: (kind: Exclude<ModalKind, null>) => void;
  selectLocale: (locale: Locale) => void;
  soundEnabled: boolean;
  soundAvailable: boolean;
  toggleSound: () => void;
  musicEnabled: boolean;
  ambienceEnabled: boolean;
  toggleMusic: () => void;
  toggleAmbience: () => void;
  fullscreen: boolean;
  changeFullscreen: (enter: boolean) => Promise<boolean>;
  platformUnavailable: boolean;
  onReconnect: () => void;
  mood: Mood;
  onMood: (mood: Mood) => void;
  inNap: boolean;
  onEquip: (id: DecorationId) => void;
  standaloneMode: boolean;
  onConfirmExit: () => void;
}

export function LittleDialog({ kind, onClose, returnFocus, locale, t, progress, storageAvailable, saveStatus, onPractice, onFinishTutorial, tutorialReturning, suspended, onTutorialActivity, onOpen, selectLocale, soundEnabled, soundAvailable, toggleSound, musicEnabled, ambienceEnabled, toggleMusic, toggleAmbience, fullscreen, changeFullscreen, platformUnavailable, onReconnect, mood, onMood, inNap, onEquip, standaloneMode, onConfirmExit }: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [fullscreenDenied, setFullscreenDenied] = useState(false);
  const [fullscreenBusy, setFullscreenBusy] = useState(false);
  const mounted = useRef(true);
  const isPresent = useIsPresent();
  const blocked = suspended || !isPresent;
  const storageMessage = saveStatus === 'future' ? 'journal.future' : saveStatus === 'recovered' ? 'journal.recovered' : storageAvailable ? 'journal.saved' : 'journal.unsaved';

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  useEffect(() => {
    const previous = returnFocus || document.activeElement as HTMLElement | null;
    const first = dialogRef.current?.querySelector<HTMLElement>(kind === 'intro' ? '.practice-area' : 'button');
    focusSafely(first || null);
    return () => {
      focusSafely(previous);
    };
  }, [returnFocus, kind]);

  return (
    <motion.div className="dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(event) => { if (!blocked && event.target === event.currentTarget) onClose(); }}>
      <motion.div
        ref={dialogRef} className={`little-dialog dialog-kind-${kind}`} role="dialog" aria-modal="true" aria-labelledby="dialog-title"
        inert={blocked}
        initial={{ y: 20, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: 10, scale: 0.98 }} transition={{ duration: 0.25 }}
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return;
          const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), select:not([disabled]), a[href], [tabindex="0"]') || []).filter((element) => element.getClientRects().length > 0);
          if (!controls?.length) return;
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }}
      >
        <button className="icon-button dialog-close" onClick={onClose} aria-label={t('dialog.close')}><X size={20} /></button>
        <div className="dialog-content">
        {kind === 'room' && <><RoomView progress={progress} t={t} onEquip={onEquip} onClose={onClose} /><p className={`dialog-footnote ${saveStatus === 'ok' ? '' : 'storage-warning'}`}>{t(storageMessage)}</p></>}
        {kind === 'intro' && <NapTutorial t={t} onFinish={onFinishTutorial} returning={tutorialReturning} suspended={blocked} onActivityChange={onTutorialActivity} />}
        {kind === 'settings' && <>
          <Settings2 className="settings-art" strokeWidth={1.4} />
          <span className="eyebrow">{t('settings.eyebrow')}</span>
          <h2 id="dialog-title">{t('settings.title')}</h2>
          <div className="settings-list">
            <div className="setting-row">
              <Clock3 size={21} strokeWidth={1.6} />
              <div><h3>{t('settings.pace')}</h3><p>{t(inNap ? 'scenario.locked' : `mood.${mood}Description`)}</p></div>
              <select className="language-select pace-select" aria-label={t('mood.choose')} value={mood} disabled={inNap} onChange={(event) => {
                const value = event.target.value;
                if (!inNap && (value === 'gentle' || value === 'cozy' || value === 'dreamy')) onMood(value);
              }}>{(Object.keys(MOODS) as Mood[]).map((value) => <option key={value} value={value}>{t(`mood.${value}`)}</option>)}</select>
            </div>
            <div className="setting-row">
              <Volume2 size={21} strokeWidth={1.6} />
              <div><h3>{t('settings.sound')}</h3><p>{t(soundAvailable ? 'settings.soundHint' : 'sound.unavailable')}</p></div>
              <button className={`setting-switch ${soundEnabled ? 'is-on' : ''}`} role="switch" aria-checked={soundEnabled} aria-label={t('settings.sound')} disabled={!soundAvailable} onClick={toggleSound}><span /><span className="sr-only">{t(soundEnabled ? 'settings.on' : 'settings.off')}</span></button>
            </div>
            <div className="settings-row">
              <div><h3>{t('settings.music')}</h3><p>{t('settings.musicHint')}</p></div>
              <button className={`setting-switch ${musicEnabled ? 'is-on' : ''}`} role="switch" aria-checked={musicEnabled} aria-label={t('settings.music')} disabled={!soundAvailable || !soundEnabled} onClick={toggleMusic}><span /><span className="sr-only">{t(musicEnabled ? 'settings.on' : 'settings.off')}</span></button>
            </div>
            <div className="settings-row">
              <div><h3>{t('settings.ambience')}</h3><p>{t('settings.ambienceHint')}</p></div>
              <button className={`setting-switch ${ambienceEnabled ? 'is-on' : ''}`} role="switch" aria-checked={ambienceEnabled} aria-label={t('settings.ambience')} disabled={!soundAvailable || !soundEnabled} onClick={toggleAmbience}><span /><span className="sr-only">{t(ambienceEnabled ? 'settings.on' : 'settings.off')}</span></button>
            </div>
            <div className="setting-row language-row">
              <Globe2 size={21} strokeWidth={1.6} />
              <div><h3>{t('settings.language')}</h3></div>
              <select className="language-select" aria-label={t('settings.language')} value={locale} onChange={(event) => { if (isLocale(event.target.value)) selectLocale(event.target.value); }}>
                {LOCALES.map((language) => <option key={language} value={language} lang={language}>{LANGUAGE_NAMES[language]}</option>)}
              </select>
            </div>
            <div className="setting-row">
              <Maximize2 size={20} strokeWidth={1.6} />
              <div><h3>{t('settings.fullscreen')}</h3><p>{t('settings.fullscreenHint')}</p></div>
              <button className="small-action" disabled={fullscreenBusy} onClick={() => {
                setFullscreenBusy(true);
                void changeFullscreen(!fullscreen).then((success) => { if (mounted.current) setFullscreenDenied(!success); }, () => { if (mounted.current) setFullscreenDenied(true); }).finally(() => { if (mounted.current) setFullscreenBusy(false); });
              }}>{t(fullscreen ? 'settings.exit' : 'settings.enter')}</button>
            </div>
          </div>
          {fullscreenDenied && <p className="settings-message" role="status">{t('settings.denied')}</p>}
          <div className="settings-links"><button className="text-button" onClick={() => onOpen('guide')}><CircleHelp size={16} />{t('nav.guide')}</button><button className="text-button" onClick={() => onOpen('story')}>{t('nav.story')}<ArrowRight size={15} /></button></div>
          <SoftButton onClick={onClose}><Check size={17} />{t('settings.done')}</SoftButton>
          <p className="dialog-footnote">{t(storageMessage)}</p>
          {platformUnavailable && <><p className="platform-note">{t('settings.platformFallback')}</p><button className="text-button" onClick={onReconnect}>{t('settings.reconnect')}</button></>}
          {standaloneMode && <AssetDownloads t={t} />}
        </>}
        {kind === 'guide' && <>
          <DreamCloud className="dialog-art" />
          <span className="eyebrow">{t('guide.eyebrow')}</span>
          <h2 id="dialog-title">{t('guide.title')}</h2>
          <p className="dialog-intro">{t('guide.intro')}</p>
          <div className="guide-steps">
            {(['move', 'catch', 'avoid', 'scenario'] as const).map((step, i) => <div className="guide-step" key={step}><span className="step-number">0{i + 1}</span><div><h3>{t(`guide.${step}Title`)}</h3><p>{t(`guide.${step}`)}</p></div></div>)}
          </div>
          <div className="guide-goal"><Heart size={17} /><span>{t('guide.goal')}</span></div>
          <SoftButton onClick={onClose}><Check size={17} />{t('guide.button')}</SoftButton>
          <button className="text-button practice-link" onClick={onPractice}>{t('guide.practice')}<ArrowRight size={13} /></button>
          <p className="dialog-footnote">{t('guide.keyBefore')} <kbd>{t('controls.space')}</kbd> {t('guide.keyAfter')}</p>
        </>}
        {kind === 'story' && <>
          <MoonMark className="dialog-art story-moon" />
          <span className="eyebrow">{t('story.eyebrow')}</span>
          <h2 id="dialog-title">{t('story.title')}</h2>
          <div className="story-copy"><p>{t('story.p1')}</p><p>{t('story.p2')}</p><p><em>{t('story.p3')}</em></p><p>{t('story.p4')}</p></div>
          <div className="story-signature"><MapleLeaf />{t('story.signature')}</div>
          <SoftButton onClick={onClose}>{t('story.button')}<ArrowRight size={17} /></SoftButton>
        </>}
        {kind === 'exitConfirm' && <>
          <MoonMark className="dialog-art" />
          <h2 id="dialog-title">{t('exit.title')}</h2>
          <p className="dialog-intro">{t('exit.body')}</p>
          <SoftButton onClick={onConfirmExit}><Check size={17} />{t('exit.confirm')}</SoftButton>
          <button className="text-button" onClick={onClose}>{t('exit.cancel')}</button>
        </>}
        {kind === 'journal' && <>
          <BookOpen className="journal-art" strokeWidth={1.25} />
          <span className="eyebrow">{t('journal.eyebrow')}</span>
          <h2 id="dialog-title">{t('journal.title')}</h2>
          <p className="dialog-intro">{progress.rounds ? t('journal.intro', { wins: progress.wins, dreams: progress.dreams }) : t('journal.empty')}</p>
          <div className="journal-section-label">{t('journal.unlocked', { count: Object.keys(progress.unlocked).length })}</div>
          <ul className="achievement-list">
            {ACHIEVEMENTS.map((id) => {
              const date = progress.unlocked[id];
              return <li key={id} className={date ? 'achievement is-earned' : 'achievement'}>
                <TrophyArt id={id} className="achievement-trophy" />
                <div><h3>{t(`achievement.${id}.title`)}</h3><p>{t(`achievement.${id}.description`)}</p>{date ? <time dateTime={new Date(date).toISOString()}>{t('journal.date', { date: formatDate(locale, date) })}</time> : <span className="trophy-locked-label">{t('journal.locked')}</span>}</div>
                {date ? <Check className="earned-check" size={15} aria-label={t('journal.date', { date: formatDate(locale, date) })} /> : <span className="sr-only">{t('journal.locked')}</span>}
              </li>;
            })}
          </ul>
          <div className="dream-memories">{SCENARIO_IDS.map((scenario) => progress.scenarioWins[scenario] > 0 && <div className="dream-memory" key={scenario}><MapleLeaf /><div><h3>{t(`scenario.${scenario}.name`)}</h3><p>{t(`scenario.${scenario}.memory`)}</p></div></div>)}</div>
          <div className="journal-records"><h3>{t('journal.best')}<span className="record-pace">{t(`mood.${mood}`)}</span></h3><dl>{SCENARIO_IDS.map((scenario) => <div key={scenario}><dt>{t(`scenario.${scenario}.name`)}</dt><dd>{progress.scenarioScores[scenario][mood]}</dd></div>)}</dl></div>
          <button className="text-button journal-room-link" onClick={() => onOpen('room')}><House size={17} />{t('room.open')}<ArrowRight size={15} /></button>
          <SoftButton onClick={onClose}>{t('journal.close')}<ArrowRight size={17} /></SoftButton>
          <p className={`dialog-footnote ${saveStatus === 'ok' ? '' : 'storage-warning'}`}>{t(storageMessage)}</p>
        </>}
        </div>
      </motion.div>
    </motion.div>
  );
}