import type { DecorationId } from '../game/decorations';
import { REWARD_ART } from '../assets/vectors';
import { LocalSvg } from './LocalSvg';

export function DecorationArt({ id, className = '' }: { id: DecorationId; className?: string }) {
  return <LocalSvg asset={REWARD_ART[id]} className={className} />;
}