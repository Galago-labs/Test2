import { memo } from 'react';
import { AnimatePresence, motion, useIsPresent } from 'motion/react';
import { ArrowLeft, ArrowRight, Award, BookOpen, ChevronLeft, ChevronRight, Clock3, Gift, Heart, House, Moon, Pause, Play, RotateCcw, Settings2, Sparkles, Sun, Trophy, Wind } from './Icons';
import { AlarmClock, CatcherPillow, DreamCloud, DreamFirefly, DreamMoon, MapleLeaf, MoonMark } from './NapArt';
import { SoftButton } from './GameUI';
import type { GameSnapshot } from '../game/engine';
import { LOW_COMFORT_THRESHOLD, HIGH_COMFORT_THRESHOLD } from '../game/engine';
import type { Translator } from '../i18n';
import { SCENARIO_IDS, type Scenario } from '../game/scenarios';
import type { NapProgress } from '../game/progress';
import { nextGiftText } from './RoomView';

export const AmbientDetails = memo(function AmbientDetails({ restless }: { restless: boolean }) {
  return <div className="ambient-details" aria-hidden="true">
    {Array.from({ length: 7 }, (_, i) => <span key={i} className="sun-mote" style={{ left: `${23 + i * 10}%`, top: `${18 + (i % 3) * 24}%`, animationDelay: `${i * -1.7}s`, animationDuration: `${9 + i}s` }} />)}
    <div className={`sleep-letters ${restless ? 'is-restless' : ''}`}><span>z</span><span>z</span><span>Z</span></div>
    <MapleLeaf className="drifting-leaf" />
  </div>;
});

export function GameMenu({ t, scenario, onScenario, onStart, onJournal, onRoom, onStory }: {
  t: Translator; scenario: Scenario; onScenario: (scenario: Scenario) => void; onStart: () => void; onJournal: () => void; onRoom: () => void; onStory: () => void;
}) {
  const isPresent = useIsPresent();
  const index = SCENARIO_IDS.indexOf(scenario);
  const SceneIcon = scenario === 'afternoon' ? Sun : scenario === 'breeze' ? Wind : Moon;
  return <>
    <motion.div className="main-menu" inert={!isPresent} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.45 }}>
      <div className="menu-heading">
        <MoonMark className="menu-moon" />
        <span className="eyebrow">{t('ready.eyebrow')}</span>
        <h1><span>{t('heading.start')}</span><em>{t('heading.end')}</em></h1>
        <p>{t('menu.subtitle')}</p>
      </div>
      <div className="scenario-chooser" role="group" aria-label={t('scenario.choose')}>
        <span className="mood-caption">{t('scenario.label')}</span>
        <div className="scenario-choice-row">
          <button className="scenario-arrow" aria-label={t('scenario.previous')} onClick={() => onScenario(SCENARIO_IDS[(index + 2) % 3])}><ChevronLeft size={19} /></button>
          <div className="scenario-title"><SceneIcon size={19} strokeWidth={1.5} /><span>{t(`scenario.${scenario}.name`)}</span></div>
          <button className="scenario-arrow" aria-label={t('scenario.next')} onClick={() => onScenario(SCENARIO_IDS[(index + 1) % 3])}><ChevronRight size={19} /></button>
        </div>
        <p className="scenario-description" aria-live="polite">{t(`scenario.${scenario}.description`)}</p>
      </div>
      <SoftButton className="menu-play" onClick={onStart}><Play size={19} fill="currentColor" strokeWidth={1.2} />{t('menu.play')}<ArrowRight size={20} className="button-arrow" /></SoftButton>
      <div className="menu-secondary">
        <button onClick={onJournal}><BookOpen size={16} strokeWidth={1.6} />{t('menu.journal')}</button>
        <span aria-hidden="true" />
        <button onClick={onRoom}><House size={16} strokeWidth={1.6} />{t('room.open')}</button>
      </div>
    </motion.div>
    <button className="studio-signature" disabled={!isPresent} onClick={onStory} aria-label={t('nav.story')}><MapleLeaf /><span>{t('brand.name')}</span></button>
  </>;
}

function formatTime(seconds: number) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }

export function GameHud({ game, t, onPause }: { game: GameSnapshot; t: Translator; onPause: () => void }) {
  return <div className="game-hud" inert={game.status === 'paused'}>
    <div className={`comfort-display ${game.comfort < LOW_COMFORT_THRESHOLD ? 'comfort-low' : ''}`}>
      <Heart className="comfort-heart" size={23} strokeWidth={1.7} />
      <div className="comfort-info">
        <div className="hud-label">{t(game.comfort < LOW_COMFORT_THRESHOLD ? 'game.restless' : 'game.comfort')}</div>
        <div className="comfort-row"><div className="comfort-track" role="progressbar" aria-label={t('game.comfortLabel')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(game.comfort)}><span style={{ width: `${game.comfort}%` }} /></div><span className="comfort-value">{Math.round(game.comfort)}<small>%</small></span></div>
      </div>
    </div>
    <div className={`nap-timer ${game.remaining <= 10 ? 'time-low' : ''}`} role="timer" aria-label={t('game.timer', { seconds: game.remaining })}><Clock3 size={18} strokeWidth={1.7} /><span>{formatTime(game.remaining)}</span></div>
    <div className="hud-right">
      <div className="score-display"><Sparkles size={21} strokeWidth={1.6} /><div><span className="score-number">{game.score}</span><span className="score-label">{t('game.points')}</span></div></div>
      <button className="round-button pause-button" onClick={onPause} aria-label={t('game.pause')} title={t('game.pauseHint')}><Pause size={21} /></button>
    </div>
  </div>;
}

export function DreamLayer({ game, t }: { game: GameSnapshot; t: Translator }) {
  return <div className="play-layer" aria-hidden="true">
    {game.wind.phase !== 'calm' && <div className={`wind-leaves flow-${game.wind.direction < 0 ? 'left' : 'right'}`}><MapleLeaf /><MapleLeaf /></div>}
    {game.items.map((item) => <div key={item.id} className={`dream-sprite sprite-${item.kind}`} style={{ left: `${item.x}%`, top: `${item.y}%`, transform: `translate(-50%, -50%) rotate(${item.rotation + Math.sin(item.y / 15) * 5}deg)` }}>{item.kind === 'cloud' ? <DreamCloud /> : item.kind === 'moon' ? <DreamMoon /> : item.kind === 'firefly' ? <DreamFirefly /> : <AlarmClock />}</div>)}
    <div className={`catcher ${game.grace > 0 ? 'catcher-protected' : ''} ${game.multiplier > 1 ? 'catcher-dreamy' : ''}`} style={{ left: `${game.pillowX}%` }}><CatcherPillow /></div>
    {game.pops.map((pop) => <div key={pop.id} className={`catch-pop pop-${pop.kind}`} style={{ left: `${Math.min(79, Math.max(21, pop.x))}%`, top: `${pop.y - pop.age * 9}%`, opacity: Math.max(0, 1 - pop.age / 1.25), transform: 'translate(-50%, -50%)' }}>{pop.kind === 'good' ? <><span>+{pop.points}</span>{pop.multiplier > 1 && <small>x{pop.multiplier}</small>}</> : t(pop.kind === 'bad' ? 'game.hit' : 'game.protected')}</div>)}
    <div className="hit-flash" style={{ opacity: game.hitFlash * 0.19 }} />
    {game.wind.phase !== 'calm' ? <div className={`streak-label wind-cue wind-${game.wind.phase}`}><Wind size={16} /><span>{t(game.wind.phase === 'warning' ? 'scenario.windWarning' : game.wind.direction < 0 ? 'scenario.windLeft' : 'scenario.windRight')}</span>{game.wind.direction < 0 ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}</div> : game.combo >= 3 && <div className={`streak-label ${game.multiplier > 1 ? 'streak-bonus' : ''}`}><Sparkles size={14} /><span>{t('game.streak', { count: game.combo })}</span>{game.multiplier > 1 && <strong>{t('game.multiplier', { multiplier: game.multiplier })}</strong>}</div>}
    {game.remaining > 53 && game.status === 'playing' && <div className="first-dream-tip"><ArrowLeft size={14} /><span className="pointer-tip">{t('game.tip')}</span><span className="touch-tip">{t('controls.touch')}</span><ArrowRight size={14} /></div>}
  </div>;
}

interface OverlayProps {
  game: GameSnapshot; t: Translator; onStart: () => void; onResume: () => void; onReset: () => void;
  onJournal: () => void; onSettings: () => void; newBest: boolean; unlockedCount: number;
  onRoom: () => void; decorationCount: number; progress: NapProgress;
}

export function GameOverlays({ game, t, onStart, onResume, onReset, onJournal, onSettings, newBest, unlockedCount, onRoom, decorationCount, progress }: OverlayProps) {
  const finished = game.status === 'won' || game.status === 'lost';
  return <AnimatePresence mode="wait">
    {game.status === 'countdown' && <motion.div className="countdown-overlay" key="countdown" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
      <h2>{t(game.resuming ? 'countdown.resume' : 'countdown.start')}</h2>
      <motion.span className="countdown-number" key={game.countdown} initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} role="status" aria-live="polite">{game.countdown}</motion.span>
      <p>{t(game.resuming ? 'countdown.resumeHint' : 'countdown.hint')}</p>
    </motion.div>}
    {game.status === 'paused' && <motion.div className="state-overlay pause-overlay" key="paused" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="state-content">
        <MoonMark className="state-art" /><span className="eyebrow">{t('pause.eyebrow')}</span>
        <h2>{t('pause.title')}</h2><p>{t(game.pauseReason === 'away' ? 'pause.away' : 'pause.subtitle')}</p>
        <div className="overlay-actions"><SoftButton onClick={onResume}><Play size={18} />{t('pause.button')}</SoftButton><button className="text-button" onClick={onReset}><RotateCcw size={15} />{t('pause.room')}</button></div>
        <button className="pause-settings text-button" onClick={onSettings}><Settings2 size={16} />{t('settings.open')}</button>
        <span className="pause-footnote">{t('pause.keyBefore')} <kbd>{t('controls.space')}</kbd> {t('pause.keyAfter')}</span>
      </div>
    </motion.div>}
    {finished && <motion.div className="state-overlay result-overlay" key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="state-content" role="status" aria-live="polite">
        {game.status === 'won' ? <DreamCloud className="result-art" /> : <MoonMark className="result-art result-moon" />}
        <span className="eyebrow">{t(game.status === 'won' ? 'result.winEyebrow' : 'result.loseEyebrow')}</span>
        <h2>{t(game.status === 'won' ? game.comfort >= HIGH_COMFORT_THRESHOLD ? 'result.perfect' : 'result.win' : 'result.lose')}</h2>
        <p>{t(game.status === 'won' ? `scenario.${game.scenario}.memory` : 'result.loseText')}</p>
        <div className="result-stats"><div><strong>{game.score}</strong><span>{t('game.points')}</span></div><div><strong>{game.caught}</strong><span>{t('result.caught')}</span></div><div><strong>{Math.round(game.comfort)}<small>%</small></strong><span>{t('result.comfort')}</span></div></div>
        <div className="result-best">{newBest ? <Trophy size={15} /> : <Sparkles size={15} />}{t(newBest ? 'result.best' : 'result.combo', { count: game.maxCombo, bonus: game.bonusScore })}</div>
        <div className="overlay-actions"><SoftButton onClick={onStart}><RotateCcw size={18} />{t('result.again')}</SoftButton><button className="text-button" onClick={onReset}>{t('pause.room')}<ArrowRight size={15} /></button></div>
        {decorationCount > 0 ? <button className="result-keepsakes has-new-keepsakes" onClick={onRoom}><Gift size={16} />{t('room.new', { count: decorationCount })}<ArrowRight size={14} /></button> : unlockedCount > 0 ? <button className="result-keepsakes has-new-keepsakes" onClick={onJournal}><Award size={16} />{t('result.unlocked', { count: unlockedCount })}<ArrowRight size={14} /></button> : <button className="result-keepsakes next-gift-link" onClick={onRoom}><Gift size={16} />{nextGiftText(progress, t)}<ArrowRight size={14} /></button>}
      </div>
    </motion.div>}
  </AnimatePresence>;
}