import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, MotionConfig } from 'motion/react';
import { RotateCcw, Settings2, Volume2, VolumeX } from './components/Icons';
import { MoonMark } from './components/NapArt';
import { LittleDialog, type ModalKind } from './components/GameUI';
import { AmbientDetails, DreamLayer, GameHud, GameMenu, GameOverlays } from './components/GameScene';
import { useNapGame, type GameSnapshot, type Mood } from './game/useNapGame';
import { LOW_COMFORT_THRESHOLD, faceExpression } from './game/engine';
import { useCozyAudio } from './game/useCozyAudio';
import { useNapProgress, type AchievementId } from './game/useNapProgress';
import { useGameAssets } from './game/useGameAssets';
import { useStageLayout } from './game/useStageLayout';
import { useGameInput } from './game/useGameInput';
import { useTvNavigation } from './game/useTvNavigation';
import { initialDialogState, reduceDialog } from './game/dialogState';
import { usePlatform } from './platform/usePlatform';
import { wantsGameplay } from './platform/policy';
import { useLocale } from './i18n';
import { focusSafely } from './core/input';
import { gameplayGeometry } from './game/viewport';

export default function App() {
  const interruptRef = useRef<() => void>(() => {});
  const platform = usePlatform(() => interruptRef.current());
  const isTV = platform.connection?.sdk?.deviceInfo?.type === 'tv';
  useTvNavigation(isTV);
  const { locale, t, localeReady, selectLocale } = useLocale(platform.connection?.language, platform.connection !== null);
  const assets = useGameAssets();
  const { rootRef, safeAreaRef, layout } = useStageLayout();
  const { progress, saveStatus, storageAvailable, recordRound, markTutorialSeen, selectScenario, equipDecoration } = useNapProgress();
  const audio = useCozyAudio(platform.suspended || platform.connection === null, progress.selectedScenario);
  const [roundUnlocks, setRoundUnlocks] = useState<AchievementId[]>([]);
  const [decorationCount, setDecorationCount] = useState(0);
  const recordFinished = useCallback((result: GameSnapshot) => {
    platform.setGameplay(false);
    const earned = recordRound(result);
    setRoundUnlocks(earned.achievements);
    setDecorationCount(earned.decorations.length);
    // Yandex requirement: interstitials belong at natural pauses (after a round
    // ends), and sound must be muted while one is on screen and restored after.
    platform.showInterstitial(() => audio.muteImmediately(), () => audio.resumeFromInterrupt());
  }, [recordRound, platform.setGameplay, platform.showInterstitial, audio]);
  const { game, start, pause, resume, reset, move, setDirection, setCatchWidth, releaseInput } = useNapGame(audio.play, recordFinished);
  const [mood, setMood] = useState<Mood>('cozy');
  const [dialogs, dispatchDialog] = useReducer(reduceDialog, initialDialogState);
  const { modal, closing: dialogExiting } = dialogs;
  const [announcement, setAnnouncement] = useState('');
  const [tutorialActive, setTutorialActive] = useState(false);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const dialogReturnFocus = useRef<HTMLElement | null>(null);
  const roundBest = useRef(0);
  const queuedStart = useRef(false);
  const restoreFocus = useRef(false);
  const lowComfort = useRef(false);
  const uiReady = assets.status === 'ready' && platform.connection !== null && localeReady && layout !== null;
  const finished = game.status === 'won' || game.status === 'lost';
  const movable = game.status === 'playing' || game.status === 'countdown';
  const inNap = movable || game.status === 'paused';
  const scenario = game.status === 'ready' ? progress.selectedScenario : game.scenario;
  const controlsBlocked = !uiReady || modal !== null || dialogExiting || platform.suspended;
  const geometry = useMemo(() => layout ? gameplayGeometry(layout.logicalWidth, layout.profile) : null, [layout]);
  const canvasStyle = useMemo<CSSProperties | undefined>(() => layout && geometry ? {
    width: layout.logicalWidth,
    height: layout.logicalHeight,
    transform: `scale(${layout.scale})`,
    '--safe-top': `${layout.safe.top}px`, '--safe-right': `${layout.safe.right}px`,
    '--safe-bottom': `${layout.safe.bottom}px`, '--safe-left': `${layout.safe.left}px`,
    '--pillow-width': `${geometry.pillowWidth}px`, '--sprite-width': `${geometry.spriteWidth}px`,
  } as CSSProperties : undefined, [layout, geometry]);

  interruptRef.current = () => { pause('away'); releaseInput(); audio.muteImmediately(); platform.setGameplay(false); setTutorialActive(false); };
  const focusGame = useCallback(() => focusSafely(surfaceRef.current), []);

  const beginNap = useCallback(() => {
    if (!uiReady || platform.isSuspended()) { queuedStart.current = true; return; }
    if (movable) return;
    queuedStart.current = false;
    roundBest.current = progress.scenarioScores[progress.selectedScenario][mood];
    setRoundUnlocks([]); setDecorationCount(0); setAnnouncement(''); lowComfort.current = false;
    start(mood, progress.selectedScenario); focusGame();
  }, [uiReady, platform.isSuspended, movable, progress.scenarioScores, progress.selectedScenario, mood, start, focusGame]);

  const openModal = useCallback((kind: Exclude<ModalKind, null>, startsNap = false) => {
    if (!uiReady || platform.isSuspended() || dialogExiting) return;
    if (!modal) dialogReturnFocus.current = document.activeElement as HTMLElement | null;
    pause(); releaseInput(); platform.setGameplay(false);
    dispatchDialog({ type: 'open', modal: kind, startsNap });
  }, [uiReady, platform.isSuspended, dialogExiting, modal, pause, releaseInput, platform.setGameplay]);
  const closeModal = useCallback((startsNap = false) => {
    if (!modal || dialogExiting) return;
    restoreFocus.current = true;
    setTutorialActive(false);
    dispatchDialog({ type: 'close', startsNap });
  }, [modal, dialogExiting]);

  // Animation callbacks are cosmetic: a dropped exit event must never lock the controls.
  useEffect(() => {
    if (!dialogExiting) return;
    const revision = dialogs.revision;
    const timer = setTimeout(() => dispatchDialog({ type: 'closed', revision }), 650);
    return () => clearTimeout(timer);
  }, [dialogExiting, dialogs.revision]);

  useEffect(() => {
    if (!uiReady || platform.suspended || modal || dialogExiting) return;
    if (dialogs.startAfterClose || queuedStart.current) {
      dispatchDialog({ type: 'consume-start' }); restoreFocus.current = false; beginNap();
    } else if (restoreFocus.current) {
      restoreFocus.current = false;
      if (dialogReturnFocus.current?.isConnected) focusSafely(dialogReturnFocus.current); else focusGame();
    }
  }, [uiReady, platform.suspended, modal, dialogExiting, dialogs.startAfterClose, beginNap, focusGame]);

  const requestNap = () => {
    if (!uiReady || platform.isSuspended() || modal || dialogExiting || movable) return;
    const device = platform.connection?.sdk?.deviceInfo?.type;
    if (device === 'mobile' || device === 'tablet') void platform.changeFullscreen(true);
    if (progress.tutorialSeen) beginNap(); else openModal('intro', true);
  };
  const finishTutorial = () => { markTutorialSeen(); closeModal(dialogs.tutorialStartsNap); };
  const resumeNap = useCallback(() => { if (!platform.isSuspended()) { resume(); focusGame(); } }, [platform.isSuspended, resume, focusGame]);
  const pauseOrResume = useCallback(() => {
    if (game.status === 'paused') resumeNap(); else { pause(); releaseInput(); platform.setGameplay(false); focusGame(); }
  }, [game.status, resumeNap, pause, releaseInput, platform.setGameplay, focusGame]);

  useEffect(() => { if (uiReady && !platform.suspended) platform.ready(); }, [uiReady, platform.suspended, platform.ready]);
  useEffect(() => {
    platform.setGameplay(uiReady && !platform.suspended && !dialogExiting && wantsGameplay(game.status, modal, tutorialActive));
    return () => platform.setGameplay(false);
  }, [uiReady, platform.suspended, platform.setGameplay, game.status, modal, tutorialActive, dialogExiting]);

  const isLow = game.comfort < LOW_COMFORT_THRESHOLD;
  const expression = faceExpression(game.status, game.comfort);
  useEffect(() => {
    if (game.status !== 'playing' || isLow === lowComfort.current) return;
    lowComfort.current = isLow;
    setAnnouncement(t(isLow ? 'game.lowWarning' : 'game.restored'));
  }, [isLow, game.status, t]);

  useEffect(() => {
    if (geometry) setCatchWidth(geometry.catchWidth, geometry.pillowEdge);
  }, [geometry, setCatchWidth]);

  const lastBackPress = useRef(0);
  const input = useGameInput({
    surface: surfaceRef, blocked: controlsBlocked, movable, inNap, onPause: pauseOrResume,
    onEscape: () => {
      if (platform.isSuspended()) return;
      if (!isTV) { if (modal) closeModal(); else if (movable) pauseOrResume(); return; }
      // TV remote's Back button: a double press (within 500ms) always offers to
      // exit; otherwise it closes whatever's open, or — with nothing open, on
      // the start menu specifically — also offers to exit (there's nothing to
      // "go back" to from there). https://yandex.com/dev/games/doc/en/requirements/1/6/3
      const now = performance.now();
      const isDoublePress = now - lastBackPress.current < 500;
      lastBackPress.current = now;
      if (isDoublePress && modal !== 'exitConfirm') { openModal('exitConfirm'); return; }
      if (modal) { closeModal(); return; }
      if (game.status === 'ready') { openModal('exitConfirm'); return; }
      if (movable) pauseOrResume();
    },
    move, setDirection, release: releaseInput,
  });

  return <MotionConfig reducedMotion="user">
    <div ref={rootRef} className="game-app" onContextMenu={(event) => event.preventDefault()} onDragStart={(event) => event.preventDefault()} onDoubleClick={(event) => event.preventDefault()}>
      <div ref={safeAreaRef} className="safe-area-probe" aria-hidden="true" />
      <div className="room-extension" aria-hidden="true" style={{ backgroundImage: `url("${assets.roomUrl}")` }} />
      <main className="game-stage" style={layout ? { width: layout.width, height: layout.height } : undefined} aria-label={t('game.label')}>
        <div className={`game-viewport is-${game.status} scenario-${scenario} ${modal || dialogExiting || platform.suspended ? 'is-interrupted' : ''}`} data-profile={layout?.profile || 'landscape'} data-layout={layout?.profile === 'portrait' ? 'portrait' : 'landscape'} style={canvasStyle}>
        <div className="game-content" inert={controlsBlocked}>
          <div ref={surfaceRef} className="game-surface" tabIndex={0} role="application" aria-label={t('game.instructions')} {...input}>
            <img className="room-image" src={assets.roomUrl} alt={t('game.image')} draggable={false} />
            <img className="room-image expression-overlay" style={{ opacity: expression === 'content' ? 1 : 0 }} src={assets.momoContentUrl} alt="" aria-hidden="true" draggable={false} />
            <img className="room-image expression-overlay" style={{ opacity: expression === 'anxious' ? 1 : 0 }} src={assets.momoAnxiousUrl} alt="" aria-hidden="true" draggable={false} />
            <div className="scene-scrim" /><AmbientDetails restless={isLow || game.status === 'lost'} />
            {uiReady && <>
              <AnimatePresence>{game.status === 'ready' && <GameMenu key="menu" t={t} scenario={scenario} onScenario={(next) => { if (!controlsBlocked && game.status === 'ready') selectScenario(next); }} onStart={requestNap} onJournal={() => openModal('journal')} onRoom={() => openModal('room')} onStory={() => openModal('story')} />}</AnimatePresence>
              {game.status === 'ready' && <div className="menu-tools">
                <button className="round-button" onClick={audio.toggle} disabled={!audio.available} aria-label={t(audio.enabled ? 'sound.disable' : 'sound.enable')} aria-pressed={audio.enabled} title={t(audio.enabled ? 'sound.on' : 'sound.off')}>{audio.enabled ? <Volume2 size={21} strokeWidth={1.7} /> : <VolumeX size={21} strokeWidth={1.7} />}</button>
                <button className="round-button" onClick={() => openModal('settings')} aria-label={t('settings.open')} title={t('settings.open')}><Settings2 size={21} strokeWidth={1.7} /></button>
              </div>}
              {inNap && <><GameHud game={game} t={t} onPause={pauseOrResume} /><DreamLayer game={game} t={t} /></>}
              <GameOverlays game={game} t={t} onStart={requestNap} onResume={resumeNap} onReset={() => { queuedStart.current = false; platform.setGameplay(false); reset(); focusGame(); }} onJournal={() => openModal('journal')} onSettings={() => openModal('settings')} newBest={finished && game.score > roundBest.current} unlockedCount={roundUnlocks.length} onRoom={() => openModal('room')} decorationCount={decorationCount} progress={progress} />
              <span className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</span>
            </>}
          </div>
        </div>
        {!uiReady && <div className="boot-screen" role="status" aria-live="polite"><MoonMark /><p>{t(assets.status === 'error' ? 'boot.failed' : assets.status === 'ready' && !platform.connection ? 'boot.connecting' : 'boot.loading')}</p>{assets.status === 'error' ? <button className="primary-button" onClick={assets.retry}><RotateCcw size={16} />{t('boot.retry')}</button> : <span className="loading-line" aria-hidden="true" />}</div>}
        <AnimatePresence mode="wait" onExitComplete={() => dispatchDialog({ type: 'closed', revision: dialogs.revision })}>
          {modal && <LittleDialog
            key={modal} kind={modal} onClose={() => closeModal()} returnFocus={dialogReturnFocus.current}
            locale={locale} t={t} progress={progress} storageAvailable={storageAvailable} saveStatus={saveStatus}
            onPractice={() => openModal('intro')} onFinishTutorial={finishTutorial} tutorialReturning={!dialogs.tutorialStartsNap}
            suspended={platform.suspended || !uiReady} onTutorialActivity={setTutorialActive} onOpen={openModal}
            selectLocale={selectLocale} soundEnabled={audio.enabled} soundAvailable={audio.available} toggleSound={audio.toggle}
            musicEnabled={audio.musicEnabled} ambienceEnabled={audio.ambienceEnabled} toggleMusic={audio.toggleMusic} toggleAmbience={audio.toggleAmbience}
            fullscreen={platform.fullscreen} changeFullscreen={platform.changeFullscreen} platformUnavailable={platform.connection?.initializationFailed || false} onReconnect={platform.reconnect}
            mood={mood} onMood={setMood} inNap={inNap} onEquip={equipDecoration}
            standaloneMode={platform.connection?.mode === 'standalone'}
            onConfirmExit={() => { try { window.close(); } catch { /* Most contexts ignore this; the TV shell owns the actual exit. */ } }}
          />}
        </AnimatePresence>
        </div>
      </main>
    </div>
  </MotionConfig>;
}