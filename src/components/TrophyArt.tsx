import type { AchievementId } from '../game/achievements.ts';
import { TROPHY_ART } from '../assets/vectors.ts';
import { LocalSvg } from './LocalSvg.tsx';

export function TrophyArt({ id, className = '' }: { id: AchievementId; className?: string }) {
  return <LocalSvg asset={TROPHY_ART[id]} className={className} />;
}