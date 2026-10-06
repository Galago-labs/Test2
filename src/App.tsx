// © 2026 Oriby Games. All rights reserved. Unauthorized copying or redistribution is prohibited.
// Third-party components: see public/third-party-notices.txt.
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, MotionConfig } from 'motion/react';
import { RotateCcw, Volume2, VolumeX } from './components/Icons.tsx';
import { MoonMark } from './components/NapArt.tsx';
import { MenuButton } from './components/MenuButton.tsx';
import { DialogHost } from './components/dialogs/DialogHost.tsx';
import type { DialogServices } from './components/dialogs/DialogContext.tsx';
import { ROOM_FOCUS } from './game/artworkPlacement.ts';
import { AmbientDetails, DreamLayer, GameHud, GameMenu, GameOverlays } from './components/GameScene.tsx';
import { useNapGame, type GameSnapshot, type Mood } from './game/useNapGame.ts';
import { LOW_COMFORT_THRESHOLD, faceExpression } from './game/engine.ts';
import type { Scenario } from './game/scenarios.ts';
import { useCozyAudio } from './game/useCozyAudio.ts';
import { useNapProgress } from './game/useNapProgress.ts';
import { useTutorialSeen } from './game/useTutorialSeen.ts';
import type { AchievementId } from './game/achievements.ts';
import type { SaveSlot } from './game/saveSlots.ts';
import { adAfterDreamLeft, adAfterGame, type AdDecision } from './game/adPolicy.ts';
import { AD_CONFIG } from './config/ads.ts';
import { useGameAssets } from './game/useGameAssets.ts';
import { useStageLayout } from './game/useStageLayout.ts';
import { useGameInput } from './game/useGameInput.ts';
import { useTvNavigation } from './game/useTvNavigation.ts';
import { isCapacitorNative, requestAppExit, useCapacitorBackButton } from './platform/capacitorBridge.ts';
import { initialDialogState, reduceDialog, type DialogIntent, type DialogKind } from './game/dialogState.ts';
import { usePlatform } from './platform/usePlatform.ts';
import { wantsGameplay } from './platform/policy.ts';
import { useLocale } from './i18n.ts';
import { focusSafely } from './core/input.ts';
import { gameplayGeometry } from './game/viewport.ts';

export default function App() {
  const interruptRef = useRef<() => void>(() => {});
  const platform = usePlatform(() => interruptRef.current());
  const isTV = platform.connection?.sdk?.deviceInfo?.type === 'tv';
  useTvNavigation(isTV);
  const { locale, t, localeReady, selectLocale } = useLocale(platform.connection?.language, platform.connection !== null);
  const assets = useGameAssets();
  const { rootRef, safeAreaRef, layout } = useStageLayout();
  const { progress, activeSlot, saveStatus, storageAvailable, recordRound, readProgress, markAdShown, selectScenario, equipDecoration, switchSlot, deleteSlot, listSlots } = useNapProgress();
  const { tutorialSeen, markTutorialSeen } = useTutorialSeen();
  const audio = useCozyAudio(platform.suspended || platform.connection === null, progress.selectedScenario);
  const [roundUnlocks, setRoundUnlocks] = useState<AchievementId[]>([]);
  const [decorationCount, setDecorationCount] = useState(0);
  const [completedScenario, setCompletedScenario] = useState<Scenario | null>(null);
  // Ads follow src/game/adPolicy.ts and are configured in src/config/ads.ts. The count
  // is per save, kept in the save itself, and it only goes up when an ad has really
  // opened — so one that could not be shown is simply offered again at the next chance.
  const offerAd = useCallback((decision: AdDecision | null) => {
    if (!decision) return;
    // Yandex requirement: sound must be muted while an ad is on screen and restored after.
    platform.showInterstitial(() => { markAdShown(decision.key); audio.muteImmediately(); }, () => audio.resumeFromInterrupt());
  }, [platform.showInterstitial, markAdShown, audio]);
  const adLedger = useCallback(() => { const save = readProgress(); return { gamesFinished: save.rounds, adsShown: save.adsShown }; }, [readProgress]);
  const recordFinished = useCallback((result: GameSnapshot) => {
    platform.setGameplay(false);
    const earned = recordRound(result);
    setRoundUnlocks(earned.achievements);
    setDecorationCount(earned.decorations.length);
    setCompletedScenario(earned.completedScenario);
    // Only a game that actually finished counts; a round abandoned half-way does not.
    if (earned.counted) offerAd(adAfterGame(AD_CONFIG, adLedger(), earned.completedScenario));
  }, [recordRound, platform.setGameplay, offerAd, adLedger]);
  const { game, start, pause, resume, reset, move, setDirection, setCatchWidth, releaseInput } = useNapGame(audio.play, recordFinished);
  const [mood, setMood] = useState<Mood>('cozy');
  const [dialogs, dispatchDialog] = useReducer(reduceDialog, initialDialogState);
  const { kind: activeDialog, closing: dialogExiting } = dialogs;
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
  const controlsBlocked = !uiReady || activeDialog !== null || dialogExiting || platform.suspended;
  const geometry = useMemo(() => layout ? gameplayGeometry(layout.logicalWidth, layout.profile) : null, [layout]);
  const canvasStyle = useMemo<CSSProperties | undefined>(() => layout && geometry ? {
    width: layout.logicalWidth,
    height: layout.logicalHeight,
    transform: `scale(${layout.scale})`,
    '--safe-top': `${layout.safe.top}px`, '--safe-right': `${layout.safe.right}px`,
    '--safe-bottom': `${layout.safe.bottom}px`, '--safe-left': `${layout.safe.left}px`,
    '--pillow-width': `${geometry.pillowWidth}px`, '--sprite-width': `${geometry.spriteWidth}px`,
    '--art-x': `${ROOM_FOCUS[layout.profile].x * 100}%`, '--art-y': `${ROOM_FOCUS[layout.profile].y * 100}%`,
  } as CSSProperties : undefined, [layout, geometry]);

  interruptRef.current = () => { pause('away'); releaseInput(); audio.muteImmediately(); platform.setGameplay(false); setTutorialActive(false); };
  const focusGame = useCallback(() => focusSafely(surfaceRef.current), []);

  const beginNap = useCallback(() => {
    if (!uiReady || platform.isSuspended()) { queuedStart.current = true; return; }
    if (movable) return;
    queuedStart.current = false;
    roundBest.current = progress.scenarioScores[progress.selectedScenario][mood];
    setRoundUnlocks([]); setDecorationCount(0); setCompletedScenario(null); setAnnouncement(''); lowComfort.current = false;
    start(mood, progress.selectedScenario); focusGame();
  }, [uiReady, platform.isSuspended, movable, progress.scenarioScores, progress.selectedScenario, mood, start, focusGame]);

  const openDialog = useCallback((kind: DialogKind, intent?: DialogIntent) => {
    if (!uiReady || platform.isSuspended() || dialogExiting) return;
    if (!activeDialog) dialogReturnFocus.current = document.activeElement as HTMLElement | null;
    pause(); releaseInput(); platform.setGameplay(false);
    dispatchDialog({ type: 'open', kind, intent });
  }, [uiReady, platform.isSuspended, dialogExiting, activeDialog, pause, releaseInput, platform.setGameplay]);
  const closeDialog = useCallback((fulfil = false) => {
    if (!activeDialog || dialogExiting) return;
    restoreFocus.current = true;
    setTutorialActive(false);
    // The dream's picture is a reward: it is never gated behind an ad or interrupted by
    // one. The ad comes when the player has finished looking and leaves it — by its own
    // button, the dialog's X, or Escape/back (closeDialog is the one path they all share).
    if (activeDialog === 'dreamReveal' && completedScenario) offerAd(adAfterDreamLeft(AD_CONFIG, adLedger(), completedScenario));
    dispatchDialog({ type: 'close', fulfil });
  }, [activeDialog, dialogExiting, completedScenario, offerAd, adLedger]);

  // Animation callbacks are cosmetic: a dropped exit event must never lock the controls.
  useEffect(() => {
    if (!dialogExiting) return;
    const revision = dialogs.revision;
    const timer = setTimeout(() => dispatchDialog({ type: 'closed', revision }), 650);
    return () => clearTimeout(timer);
  }, [dialogExiting, dialogs.revision]);

  useEffect(() => {
    if (!uiReady || platform.suspended || activeDialog || dialogExiting) return;
    if (dialogs.pendingIntent === 'start-nap' || queuedStart.current) {
      dispatchDialog({ type: 'intent-handled' }); restoreFocus.current = false; beginNap();
    } else if (restoreFocus.current) {
      restoreFocus.current = false;
      if (dialogReturnFocus.current?.isConnected) focusSafely(dialogReturnFocus.current); else focusGame();
    }
  }, [uiReady, platform.suspended, activeDialog, dialogExiting, dialogs.pendingIntent, beginNap, focusGame]);

  const requestNap = () => {
    if (!uiReady || platform.isSuspended() || activeDialog || dialogExiting || movable) return;
    const device = platform.connection?.sdk?.deviceInfo?.type;
    if (device === 'mobile' || device === 'tablet') void platform.changeFullscreen(true);
    if (tutorialSeen) beginNap(); else openDialog('intro', 'start-nap');
  };
  const finishTutorial = useCallback(() => { markTutorialSeen(); closeDialog(true); }, [markTutorialSeen, closeDialog]);
  const resumeNap = useCallback(() => { if (!platform.isSuspended()) { resume(); focusGame(); } }, [platform.isSuspended, resume, focusGame]);
  const pauseOrResume = useCallback(() => {
    if (game.status === 'paused') resumeNap(); else { pause(); releaseInput(); platform.setGameplay(false); focusGame(); }
  }, [game.status, resumeNap, pause, releaseInput, platform.setGameplay, focusGame]);

  useEffect(() => { if (uiReady && !platform.suspended) platform.ready(); }, [uiReady, platform.suspended, platform.ready]);
  useEffect(() => {
    platform.setGameplay(uiReady && !platform.suspended && !dialogExiting && wantsGameplay(game.status, activeDialog, tutorialActive));
    return () => platform.setGameplay(false);
  }, [uiReady, platform.suspended, platform.setGameplay, game.status, activeDialog, tutorialActive, dialogExiting]);

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

  const isNativeApp = isCapacitorNative();
  const lastBackPress = useRef(0);
  const handleBack = useCallback(() => {
    if (platform.isSuspended()) return;
    if (!isTV && !isNativeApp) {
      if (activeDialog) closeDialog();
      else if (movable) pauseOrResume();
      else if (game.status !== 'paused') openDialog('menu');
      return;
    }
    // TV remote's Back button, and Android's hardware/gesture back button, share
    // the same convention: a double press (within 500ms) always offers to exit;
    // otherwise it closes whatever's open, or — with nothing open, on the start
    // menu specifically — also offers to exit (there's nothing to "go back" to
    // from there). https://yandex.com/dev/games/doc/en/requirements/1/6/3
    const now = performance.now();
    const isDoublePress = now - lastBackPress.current < 500;
    lastBackPress.current = now;
    if (isDoublePress && activeDialog !== 'exitConfirm') { openDialog('exitConfirm'); return; }
    if (activeDialog) { closeDialog(); return; }
    if (game.status === 'ready') { openDialog('exitConfirm'); return; }
    if (movable) pauseOrResume();
  }, [platform.isSuspended, isTV, isNativeApp, activeDialog, closeDialog, movable, game.status, openDialog, pauseOrResume]);
  useCapacitorBackButton(isNativeApp, handleBack);
  const input = useGameInput({
    surface: surfaceRef, blocked: controlsBlocked, movable, inNap, onPause: pauseOrResume,
    onEscape: handleBack,
    move, setDirection, release: releaseInput,
  });

  // Ends whatever round is on screen (results, or a paused nap) and returns to the start screen.
  const leaveRound = useCallback(() => { queuedStart.current = false; platform.setGameplay(false); reset(); }, [platform.setGameplay, reset]);
  const selectSlot = useCallback((slot: SaveSlot) => {
    if (inNap) return;
    if (slot !== activeSlot) { switchSlot(slot); leaveRound(); }
    closeDialog();
  }, [inNap, activeSlot, switchSlot, leaveRound, closeDialog]);
  const removeSlot = useCallback((slot: SaveSlot) => {
    const removed = deleteSlot(slot);
    if (removed && slot === activeSlot) leaveRound();
    return removed;
  }, [deleteSlot, activeSlot, leaveRound]);
  const closeActiveDialog = useCallback(() => closeDialog(), [closeDialog]);
  const dialogServices = useMemo<DialogServices>(() => ({
    t, locale, selectLocale, suspended: platform.suspended || !uiReady,
    close: closeActiveDialog, open: openDialog,
    progress, save: { status: saveStatus, available: storageAvailable },
    audio: {
      enabled: audio.enabled, available: audio.available, toggle: audio.toggle,
      musicEnabled: audio.musicEnabled, toggleMusic: audio.toggleMusic,
      ambienceEnabled: audio.ambienceEnabled, toggleAmbience: audio.toggleAmbience,
    },
    display: {
      fullscreen: platform.fullscreen, changeFullscreen: platform.changeFullscreen,
      platformUnavailable: platform.connection?.initializationFailed ?? false, reconnect: platform.reconnect,
    },
    pace: { mood, select: setMood, locked: inNap },
    equipDecoration,
    tutorial: { returning: dialogs.intent === null, finish: finishTutorial, onActivityChange: setTutorialActive },
    saves: { active: activeSlot, locked: inNap, list: listSlots, select: selectSlot, remove: removeSlot },
    completedScenario, canExit: isNativeApp, confirmExit: requestAppExit,
  }), [
    t, locale, selectLocale, platform.suspended, uiReady, closeActiveDialog, openDialog, progress, saveStatus, storageAvailable,
    audio.enabled, audio.available, audio.toggle, audio.musicEnabled, audio.toggleMusic, audio.ambienceEnabled, audio.toggleAmbience,
    platform.fullscreen, platform.changeFullscreen, platform.connection?.initializationFailed, platform.reconnect,
    mood, inNap, equipDecoration, dialogs.intent, finishTutorial, activeSlot, listSlots, selectSlot, removeSlot, completedScenario, isNativeApp,
  ]);

  return <MotionConfig reducedMotion="user">
    <div ref={rootRef} className="game-app" onContextMenu={(event) => event.preventDefault()} onDragStart={(event) => event.preventDefault()} onDoubleClick={(event) => event.preventDefault()}>
      <div ref={safeAreaRef} className="safe-area-probe" aria-hidden="true" />
      <div className="room-extension" aria-hidden="true" style={{ backgroundImage: `url("${assets.roomUrl}")` }} />
      <main className="game-stage" style={layout ? { width: layout.width, height: layout.height } : undefined} aria-label={t('game.label')}>
        <div className={`game-viewport is-${game.status} scenario-${scenario} ${activeDialog || dialogExiting || platform.suspended ? 'is-interrupted' : ''}`} data-profile={layout?.profile || 'landscape'} data-layout={layout?.profile === 'portrait' ? 'portrait' : 'landscape'} style={canvasStyle}>
        <div className="game-content" inert={controlsBlocked}>
          <div ref={surfaceRef} className="game-surface" tabIndex={0} role="application" aria-label={t('game.instructions')} {...input}>
            <img className="room-image" src={assets.roomUrl} alt={t('game.image')} draggable={false} />
            <img className="room-image expression-overlay" style={{ opacity: expression === 'content' ? 1 : 0 }} src={assets.momoContentUrl} alt="" aria-hidden="true" draggable={false} />
            <img className="room-image expression-overlay" style={{ opacity: expression === 'anxious' ? 1 : 0 }} src={assets.momoAnxiousUrl} alt="" aria-hidden="true" draggable={false} />
            <img className="room-image expression-overlay" style={{ opacity: expression === 'awake' ? 1 : 0 }} src={assets.momoAwakeUrl} alt="" aria-hidden="true" draggable={false} />
            <div className="scene-scrim" /><AmbientDetails restless={isLow || game.status === 'lost'} layout={layout} />
            {uiReady && <>
              <AnimatePresence>{game.status === 'ready' && <GameMenu key="menu" t={t} scenario={scenario} onScenario={(next) => { if (!controlsBlocked && game.status === 'ready') selectScenario(next); }} onStart={requestNap} onJournal={() => openDialog('journal')} onRoom={() => openDialog('room')} onStory={() => openDialog('story')} />}</AnimatePresence>
              {!inNap && <div className="menu-tools">
                <button className="round-button" onClick={audio.toggle} disabled={!audio.available} aria-label={t(audio.enabled ? 'sound.disable' : 'sound.enable')} aria-pressed={audio.enabled} title={t(audio.enabled ? 'sound.on' : 'sound.off')}>{audio.enabled ? <Volume2 size={21} strokeWidth={1.7} /> : <VolumeX size={21} strokeWidth={1.7} />}</button>
                <MenuButton t={t} onOpen={() => openDialog('menu')} />
              </div>}
              {inNap && <><GameHud game={game} t={t} onPause={pauseOrResume} onMenu={() => openDialog('menu')} /><DreamLayer game={game} t={t} /></>}
              <GameOverlays game={game} t={t} onStart={requestNap} onResume={resumeNap} onReset={() => { leaveRound(); focusGame(); }} onJournal={() => openDialog('journal')} onMenu={() => openDialog('menu')} newBest={finished && game.score > roundBest.current} unlockedCount={roundUnlocks.length} onRoom={() => openDialog('room')} decorationCount={decorationCount} completedScenario={completedScenario} onDreamReveal={() => openDialog('dreamReveal')} progress={progress} />
              <span className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</span>
            </>}
          </div>
        </div>
        {!uiReady && <div className="boot-screen" role="status" aria-live="polite"><MoonMark /><p>{t(assets.status === 'error' ? 'boot.failed' : assets.status === 'ready' && !platform.connection ? 'boot.connecting' : 'boot.loading')}</p>{assets.status === 'error' ? <button className="primary-button" onClick={assets.retry}><RotateCcw size={16} />{t('boot.retry')}</button> : <span className="loading-line" aria-hidden="true" />}</div>}
        <AnimatePresence mode="wait" onExitComplete={() => dispatchDialog({ type: 'closed', revision: dialogs.revision })}>
          {activeDialog && <DialogHost key={activeDialog} kind={activeDialog} services={dialogServices} returnFocusRef={dialogReturnFocus} />}
        </AnimatePresence>
        </div>
      </main>
    </div>
  </MotionConfig>;
}