import { ArrowRight, BookOpen, Check, House } from '../Icons.tsx';
import { MapleLeaf } from '../NapArt.tsx';
import { SoftButton } from '../SoftButton.tsx';
import { TrophyArt } from '../TrophyArt.tsx';
import { DREAM_IMAGES } from '../../assets/images.ts';
import { ACHIEVEMENTS } from '../../game/progress.ts';
import { SCENARIO_DREAM_GOAL, SCENARIO_IDS } from '../../game/scenarios.ts';
import { formatDate } from '../../i18n.ts';
import { useDialog } from './DialogContext.tsx';
import { SaveFootnote } from './SaveFootnote.tsx';

function Achievements() {
  const { t, locale, progress } = useDialog();
  return <ul className="achievement-list">
    {ACHIEVEMENTS.map((id) => {
      const date = progress.unlocked[id];
      const earnedOn = date ? t('journal.date', { date: formatDate(locale, date) }) : null;
      return <li key={id} className={date ? 'achievement is-earned' : 'achievement'}>
        <TrophyArt id={id} className="achievement-trophy" />
        <div>
          <h3>{t(`achievement.${id}.title`)}</h3>
          <p>{t(`achievement.${id}.description`)}</p>
          {date ? <time dateTime={new Date(date).toISOString()}>{earnedOn}</time> : <span className="trophy-locked-label">{t('journal.locked')}</span>}
        </div>
        {date ? <Check className="earned-check" size={15} aria-label={earnedOn ?? undefined} /> : <span className="sr-only">{t('journal.locked')}</span>}
      </li>;
    })}
  </ul>;
}

function DreamMemories() {
  const { t, progress } = useDialog();
  const total = SCENARIO_IDS.reduce((sum, scenario) => sum + Math.min(progress.scenarioWins[scenario], SCENARIO_DREAM_GOAL), 0);
  return <>
    <div className="dream-progress-total">{t('journal.dreamsTotal', { current: total, goal: SCENARIO_IDS.length * SCENARIO_DREAM_GOAL })}</div>
    <div className="dream-memories">
      {SCENARIO_IDS.map((scenario) => {
        const wins = progress.scenarioWins[scenario];
        if (wins <= 0) return null;
        const current = Math.min(wins, SCENARIO_DREAM_GOAL);
        const complete = current >= SCENARIO_DREAM_GOAL;
        const name = t(`scenario.${scenario}.name`);
        return <div className={`dream-memory ${complete ? 'is-complete' : ''}`} key={scenario}>
          {complete ? <img className="dream-memory-art" src={DREAM_IMAGES[scenario]} alt="" draggable={false} /> : <MapleLeaf />}
          <div>
            <h3>{name}{complete && <Check size={13} className="dream-complete-mark" />}</h3>
            <p>{t(`scenario.${scenario}.memory`)}</p>
            {!complete && <div className="decor-progress-row">
              <div className="decor-progress" role="progressbar" aria-label={name} aria-valuemin={0} aria-valuemax={SCENARIO_DREAM_GOAL} aria-valuenow={current}>
                <span style={{ width: `${current / SCENARIO_DREAM_GOAL * 100}%` }} />
              </div>
              <span>{t('room.progress', { current, goal: SCENARIO_DREAM_GOAL })}</span>
            </div>}
          </div>
        </div>;
      })}
    </div>
  </>;
}

function Records() {
  const { t, progress, pace } = useDialog();
  return <div className="journal-records">
    <h3>{t('journal.best')}<span className="record-pace">{t(`mood.${pace.mood}`)}</span></h3>
    <dl>{SCENARIO_IDS.map((scenario) => <div key={scenario}><dt>{t(`scenario.${scenario}.name`)}</dt><dd>{progress.scenarioScores[scenario][pace.mood]}</dd></div>)}</dl>
  </div>;
}

export function JournalDialog() {
  const { t, progress, close, open } = useDialog();
  return <>
    <BookOpen className="journal-art" strokeWidth={1.25} />
    <span className="eyebrow">{t('journal.eyebrow')}</span>
    <h2 id="dialog-title">{t('journal.title')}</h2>
    <p className="dialog-intro">{progress.rounds ? t('journal.intro', { wins: progress.wins, dreams: progress.dreams }) : t('journal.empty')}</p>
    <div className="journal-section-label">{t('journal.unlocked', { count: Object.keys(progress.unlocked).length })}</div>
    <Achievements />
    <DreamMemories />
    <Records />
    <button className="text-button journal-room-link" onClick={() => open('room')}><House size={17} />{t('room.open')}<ArrowRight size={15} /></button>
    <SoftButton onClick={close}>{t('journal.close')}<ArrowRight size={17} /></SoftButton>
    <SaveFootnote warn />
  </>;
}
