import { useCallback, useRef, useState } from 'react';
import { browserStorage } from '../core/storage';
import { applyRound, loadProgress, persistProgress, toggleDecoration, type NapProgress } from './progress';
import type { GameSnapshot } from './engine';
import { isScenario, type Scenario } from './scenarios';
import type { DecorationId } from './decorations';

export { ACHIEVEMENTS, PROGRESS_KEY, emptyProgress, parseProgress, earnedAchievements } from './progress';
export type { NapProgress, AchievementId, SaveStatus } from './progress';

export function useNapProgress() {
  const [initial] = useState(() => loadProgress(browserStorage()));
  const [progress, setProgress] = useState(initial.progress);
  const [saveStatus, setSaveStatus] = useState(initial.status);
  const progressRef = useRef(initial.progress);
  const futureSchema = useRef(initial.status === 'future');

  const commit = useCallback((next: NapProgress) => {
    progressRef.current = next;
    const status = futureSchema.current ? 'future' : persistProgress(browserStorage(), next);
    if (status === 'future') futureSchema.current = true;
    setProgress(next);
    setSaveStatus(status);
  }, []);

  const markTutorialSeen = useCallback(() => {
    if (!progressRef.current.tutorialSeen) commit({ ...progressRef.current, tutorialSeen: true });
  }, [commit]);

  const recordRound = useCallback((game: GameSnapshot) => {
    const result = applyRound(progressRef.current, game);
    if (result.progress !== progressRef.current) commit(result.progress);
    return { achievements: result.unlocked, decorations: result.decorations, completedScenario: result.completedScenario };
  }, [commit]);

  const selectScenario = useCallback((scenario: Scenario) => {
    if (isScenario(scenario) && progressRef.current.selectedScenario !== scenario) commit({ ...progressRef.current, selectedScenario: scenario });
  }, [commit]);
  const equipDecoration = useCallback((id: DecorationId) => {
    const next = toggleDecoration(progressRef.current, id);
    if (next !== progressRef.current) commit(next);
  }, [commit]);

  return { progress, saveStatus, storageAvailable: saveStatus === 'ok' || saveStatus === 'recovered', markTutorialSeen, recordRound, selectScenario, equipDecoration };
}