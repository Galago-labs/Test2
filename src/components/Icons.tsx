import { UI_ART } from '../assets/vectors';
import { LocalSvg, type LocalSvgProps } from './LocalSvg';

export type IconProps = LocalSvgProps & { size?: number | string };
function icon(name: keyof typeof UI_ART) {
  return function Icon({ size = 24, ...props }: IconProps) {
    return <LocalSvg asset={UI_ART[name]} width={size} height={size} {...props} />;
  };
}

export const ArrowLeft = icon('ArrowLeft');
export const ArrowRight = icon('ArrowRight');
export const ChevronLeft = icon('ChevronLeft');
export const ChevronRight = icon('ChevronRight');
export const Award = icon('Award');
export const BookOpen = icon('BookOpen');
export const Check = icon('Check');
export const CircleHelp = icon('CircleHelp');
export const Clock3 = icon('Clock3');
export const Download = icon('Download');
export const Gift = icon('Gift');
export const Globe2 = icon('Globe2');
export const Heart = icon('Heart');
export const House = icon('House');
export const LockKeyhole = icon('LockKeyhole');
export const Maximize2 = icon('Maximize2');
export const Moon = icon('Moon');
export const MousePointer2 = icon('MousePointer2');
export const Pause = icon('Pause');
export const Play = icon('Play');
export const RotateCcw = icon('RotateCcw');
export const Settings2 = icon('Settings2');
export const Sparkles = icon('Sparkles');
export const Sun = icon('Sun');
export const Trophy = icon('Trophy');
export const Volume2 = icon('Volume2');
export const VolumeX = icon('VolumeX');
export const Wind = icon('Wind');
export const X = icon('X');