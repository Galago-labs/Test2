import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, Check, CircleHelp, Clock3, Globe2, Maximize2, Settings2, Sparkles, Volume2, Wind } from '../Icons.tsx';
import { SoftButton } from '../SoftButton.tsx';
import { MOOD_IDS, isMood } from '../../game/engine.ts';
import { LANGUAGE_NAMES, LOCALES, isLocale, type Translator } from '../../i18n.ts';
import { useDialog } from './DialogContext.tsx';
import { SaveFootnote } from './SaveFootnote.tsx';

function SettingRow({ icon, title, hint, className = '', children }: { icon: ReactNode; title: string; hint?: string; className?: string; children: ReactNode }) {
  return <div className={`setting-row ${className}`}>
    {icon}
    <div><h3>{title}</h3>{hint && <p>{hint}</p>}</div>
    {children}
  </div>;
}

function SettingSwitch({ label, on, disabled = false, onToggle, t }: { label: string; on: boolean; disabled?: boolean; onToggle: () => void; t: Translator }) {
  return <button className={`setting-switch ${on ? 'is-on' : ''}`} role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={onToggle}>
    <span /><span className="sr-only">{t(on ? 'settings.on' : 'settings.off')}</span>
  </button>;
}

export function SettingsDialog() {
  const { t, locale, selectLocale, close, open, audio, display, pace } = useDialog();
  const [fullscreenBusy, setFullscreenBusy] = useState(false);
  const [fullscreenDenied, setFullscreenDenied] = useState(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const toggleFullscreen = async () => {
    setFullscreenBusy(true);
    let succeeded = false;
    try { succeeded = await display.changeFullscreen(!display.fullscreen); } catch { succeeded = false; }
    if (!mounted.current) return;
    setFullscreenDenied(!succeeded);
    setFullscreenBusy(false);
  };

  const musicAvailable = audio.available && audio.enabled;

  return <>
    <Settings2 className="settings-art" strokeWidth={1.4} />
    <span className="eyebrow">{t('settings.eyebrow')}</span>
    <h2 id="dialog-title">{t('settings.title')}</h2>
    <div className="settings-list">
      <SettingRow icon={<Clock3 size={21} strokeWidth={1.6} />} title={t('settings.pace')} hint={t(pace.locked ? 'scenario.locked' : `mood.${pace.mood}Description`)}>
        <select className="language-select pace-select" aria-label={t('mood.choose')} value={pace.mood} disabled={pace.locked}
          onChange={(event) => { if (!pace.locked && isMood(event.target.value)) pace.select(event.target.value); }}>
          {MOOD_IDS.map((value) => <option key={value} value={value}>{t(`mood.${value}`)}</option>)}
        </select>
      </SettingRow>
      <SettingRow icon={<Volume2 size={21} strokeWidth={1.6} />} title={t('settings.sound')} hint={t(audio.available ? 'settings.soundHint' : 'sound.unavailable')}>
        <SettingSwitch t={t} label={t('settings.sound')} on={audio.enabled} disabled={!audio.available} onToggle={audio.toggle} />
      </SettingRow>
      <SettingRow icon={<Sparkles size={21} strokeWidth={1.6} />} title={t('settings.music')} hint={t('settings.musicHint')}>
        <SettingSwitch t={t} label={t('settings.music')} on={audio.musicEnabled} disabled={!musicAvailable} onToggle={audio.toggleMusic} />
      </SettingRow>
      <SettingRow icon={<Wind size={21} strokeWidth={1.6} />} title={t('settings.ambience')} hint={t('settings.ambienceHint')}>
        <SettingSwitch t={t} label={t('settings.ambience')} on={audio.ambienceEnabled} disabled={!musicAvailable} onToggle={audio.toggleAmbience} />
      </SettingRow>
      <SettingRow className="language-row" icon={<Globe2 size={21} strokeWidth={1.6} />} title={t('settings.language')}>
        <select className="language-select" aria-label={t('settings.language')} value={locale} onChange={(event) => { if (isLocale(event.target.value)) selectLocale(event.target.value); }}>
          {LOCALES.map((language) => <option key={language} value={language} lang={language}>{LANGUAGE_NAMES[language]}</option>)}
        </select>
      </SettingRow>
      <SettingRow icon={<Maximize2 size={20} strokeWidth={1.6} />} title={t('settings.fullscreen')} hint={t('settings.fullscreenHint')}>
        <button className="small-action" disabled={fullscreenBusy} onClick={() => void toggleFullscreen()}>{t(display.fullscreen ? 'settings.exit' : 'settings.enter')}</button>
      </SettingRow>
    </div>
    {fullscreenDenied && <p className="settings-message" role="status">{t('settings.denied')}</p>}
    <div className="settings-links">
      <button className="text-button" onClick={() => open('guide')}><CircleHelp size={16} />{t('nav.guide')}</button>
      <button className="text-button" onClick={() => open('story')}>{t('nav.story')}<ArrowRight size={15} /></button>
    </div>
    <SoftButton onClick={close}><Check size={17} />{t('settings.done')}</SoftButton>
    <SaveFootnote />
    {display.platformUnavailable && <>
      <p className="platform-note">{t('settings.platformFallback')}</p>
      <button className="text-button" onClick={display.reconnect}>{t('settings.reconnect')}</button>
    </>}
  </>;
}
