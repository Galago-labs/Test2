import type { DecorationId } from '../game/decorations.ts';
import { REWARD_ART } from '../assets/vectors.ts';
import { LocalSvg } from './LocalSvg.tsx';

export function DecorationArt({ id, className = '' }: { id: DecorationId; className?: string }) {
  return <LocalSvg asset={REWARD_ART[id]} className={className} />;
}