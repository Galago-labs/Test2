import type { AchievementId } from '../game/progress';
import { TROPHY_ART } from '../assets/vectors';
import { LocalSvg } from './LocalSvg';

export function TrophyArt({ id, className = '' }: { id: AchievementId; className?: string }) {
  return <LocalSvg asset={TROPHY_ART[id]} className={className} />;
}