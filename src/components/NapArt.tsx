import type { CSSProperties } from 'react';
import { GAME_ART } from '../assets/vectors';
import { LocalSvg } from './LocalSvg';

type ArtProps = { className?: string; style?: CSSProperties };
export function MoonMark(props: ArtProps) { return <LocalSvg asset={GAME_ART.mark} {...props} />; }
export function DreamCloud(props: ArtProps) { return <LocalSvg asset={GAME_ART.cloud} {...props} />; }
export function DreamMoon(props: ArtProps) { return <LocalSvg asset={GAME_ART.moon} {...props} />; }
export function AlarmClock(props: ArtProps) { return <LocalSvg asset={GAME_ART.alarm} {...props} />; }
export function CatcherPillow(props: ArtProps) { return <LocalSvg asset={GAME_ART.pillow} {...props} />; }
export function MapleLeaf(props: ArtProps) { return <LocalSvg asset={GAME_ART.leaf} {...props} />; }
export function DreamFirefly(props: ArtProps) { return <LocalSvg asset={GAME_ART.firefly} {...props} />; }