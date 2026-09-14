import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, MousePointer2, Play } from './Icons';
import { AlarmClock, CatcherPillow, DreamCloud } from './NapArt';
import { clamp } from '../game/engine';
import type { Translator } from '../i18n';
import { capturePointer, releasePointer, focusSafely } from '../core/input';
import { reportFatal } from '../core/faults';

interface Practice {
  pillow: number;
  target: number;
  itemY: number;
  itemX: number;
  left: boolean;
  right: boolean;
  done: boolean;
  feedback: number;
}

function freshPractice(step: number): Practice {
  return { pillow: 50, target: 50, itemY: -15, itemX: step === 1 ? 70 : 50, left: false, right: false, done: false, feedback: 0 };
}

export function NapTutorial({ t, onFinish, returning, suspended, onActivityChange }: { t: Translator; onFinish: () => void; returning: boolean; suspended: boolean; onActivityChange: (active: boolean) => void }) {
  const [step, setStep] = useState(0);
  const practice = useRef(freshPractice(0));
  const [view, setView] = useState(() => freshPractice(0));
  const areaRef = useRef<HTMLDivElement>(null);
  const hitWidth = useRef(17);
  const suspendedRef = useRef(suspended);
  suspendedRef.current = suspended;

  useEffect(() => {
    if (suspended) { practice.current.left = false; practice.current.right = false; practice.current.target = practice.current.pillow; }
  }, [suspended]);

  useEffect(() => {
    onActivityChange(!suspended && !view.done);
    return () => onActivityChange(false);
  }, [suspended, view.done, onActivityChange]);

  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    const measure = () => {
      // clientWidth is in design units; the parent viewport already applies screen scaling.
      const width = area.clientWidth;
      if (width > 0) hitWidth.current = Math.min(25, 49 / width * 100);
    };
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(area);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  useEffect(() => {
    practice.current = freshPractice(step);
    setView({ ...practice.current });
    focusSafely(areaRef.current);
    let frameId = 0;
    let previous = 0;
    let lastPaint = 0;
    const frame = (now: number) => {
      try {
      const dt = previous ? Math.min((now - previous) / 1000, 0.05) : 0;
      previous = now;
      const state = practice.current;
      const before = state.done;
      if (!state.done && !suspendedRef.current && !document.hidden) {
        const direction = Number(state.right) - Number(state.left);
        state.target = clamp(state.target + direction * 75 * dt, 15, 85);
        state.pillow += (state.target - state.pillow) * Math.min(1, dt * 16);
        state.feedback = Math.max(0, state.feedback - dt);
        if (step === 0) state.done = Math.abs(state.pillow - 50) >= 14;
        else {
          state.itemY += 35 * dt;
          const touching = state.itemY >= 75 && state.itemY <= 89 && Math.abs(state.itemX - state.pillow) < hitWidth.current;
          if (touching && step === 1) state.done = true;
          else if (touching && step === 2) { state.itemY = -15; state.feedback = 1.3; }
          else if (state.itemY > 105) {
            if (step === 2) state.done = true;
            else { state.itemY = -15; state.feedback = 1.3; }
          }
        }
      }
      if (now - lastPaint > 1000 / 30 || before !== state.done) { setView({ ...state }); lastPaint = now; }
      if (!state.done) frameId = requestAnimationFrame(frame);
      } catch (error) { reportFatal(error); }
    };
    frameId = requestAnimationFrame(frame);
    const release = () => { practice.current.left = false; practice.current.right = false; };
    window.addEventListener('blur', release);
    return () => { cancelAnimationFrame(frameId); window.removeEventListener('blur', release); };
  }, [step]);

  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (suspendedRef.current || !event.isPrimary) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width) return;
    practice.current.target = clamp((event.clientX - bounds.left) / bounds.width * 100, 15, 85);
  };

  const stepName = step === 0 ? 'move' : step === 1 ? 'catch' : 'avoid';
  return (
    <>
      <span className="eyebrow">{t('tutorial.eyebrow')}</span>
      <h2 id="dialog-title">{t('tutorial.title')}</h2>
      <p className="dialog-intro">{t('tutorial.intro')}</p>
      <div className="practice-step" aria-live="polite">
        <span>{t('tutorial.step', { step: step + 1 })}</span>
        <h3>{view.done && step === 2 ? t('tutorial.done') : t(`tutorial.${stepName}Title`)}</h3>
        <p>{t(`tutorial.${stepName}Text`)}</p>
      </div>
      <div
        ref={areaRef} className={`practice-area ${view.done ? 'practice-complete' : ''}`}
        role="application" tabIndex={0} aria-label={t('tutorial.area')}
        onPointerMove={move}
        onPointerDown={(event) => { if (suspendedRef.current || !event.isPrimary || event.button !== 0) return; move(event); capturePointer(event.currentTarget, event.pointerId); focusSafely(event.currentTarget); }}
        onPointerUp={(event) => releasePointer(event.currentTarget, event.pointerId)}
        onPointerCancel={(event) => { releasePointer(event.currentTarget, event.pointerId); practice.current.left = false; practice.current.right = false; }}
        onKeyDown={(event) => {
          if (suspendedRef.current || event.ctrlKey || event.metaKey || event.altKey) return;
          if (event.code === 'ArrowLeft' || event.code === 'KeyA') { event.preventDefault(); practice.current.left = true; }
          if (event.code === 'ArrowRight' || event.code === 'KeyD') { event.preventDefault(); practice.current.right = true; }
        }}
        onKeyUp={(event) => {
          if (event.code === 'ArrowLeft' || event.code === 'KeyA') { event.preventDefault(); practice.current.left = false; }
          if (event.code === 'ArrowRight' || event.code === 'KeyD') { event.preventDefault(); practice.current.right = false; }
        }}
        onBlur={() => { practice.current.left = false; practice.current.right = false; }}
      >
        <div className="practice-floor" aria-hidden="true" />
        {step === 0 && !view.done && <div className="practice-direction" aria-hidden="true"><ArrowLeft size={18} /><MousePointer2 size={25} /><ArrowRight size={18} /></div>}
        {step > 0 && !view.done && <div className="practice-sprite" aria-hidden="true" style={{ left: `${view.itemX}%`, top: `${view.itemY}%` }}>{step === 1 ? <DreamCloud /> : <AlarmClock />}</div>}
        <div className="practice-pillow" style={{ left: `${view.pillow}%` }} aria-hidden="true"><CatcherPillow /></div>
        {view.done && <motion.div className="practice-success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} role="status"><Check size={26} /><span>{t('tutorial.success')}</span></motion.div>}
        {view.feedback > 0 && !view.done && <span className="practice-feedback" role="status">{t('tutorial.retry')}</span>}
      </div>
      <button className="primary-button practice-next" disabled={!view.done} onClick={() => step < 2 ? setStep(step + 1) : onFinish()}>
        {step === 2 ? <Play size={15} /> : <Check size={15} />}
        {step < 2 ? t('tutorial.next') : t(returning ? 'tutorial.back' : 'tutorial.start')}
        <ArrowRight size={16} />
      </button>
      <button className="text-button practice-skip" onClick={onFinish}>{t('tutorial.skip')}</button>
    </>
  );
}