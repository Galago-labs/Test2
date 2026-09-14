import type { DecorationId } from '../game/decorations';
import type { AchievementId } from '../game/progress';
import { parseSvgAsset, type SvgAsset } from './svg';

// Eager raw imports are part of the bundle, not runtime fetches or CDN links.
const files = import.meta.glob<string>('../../public/images/**/*.svg', { query: '?raw', import: 'default', eager: true });
export const SVG_ASSETS: Record<string, SvgAsset> = Object.fromEntries(
  Object.entries(files).map(([source, raw]) => {
    const path = source.replace('../../public/images/', '');
    return [path, parseSvgAsset(path, raw)];
  }),
);

function asset(path: string): SvgAsset {
  const image = SVG_ASSETS[path];
  if (!image) throw new Error(`Required local artwork is missing: ${path}`);
  return image;
}

export const GAME_ART = {
  cloud: asset('game/cloud.svg'), moon: asset('game/moon.svg'), alarm: asset('game/alarm-clock.svg'),
  pillow: asset('game/catcher-pillow.svg'), firefly: asset('game/firefly.svg'),
  leaf: asset('game/maple-leaf.svg'), mark: asset('game/moon-mark.svg'),
};
export const REWARD_ART: Record<DecorationId, SvgAsset> = {
  sageQuilt: asset('rewards/sage-quilt.svg'), moonPillow: asset('rewards/moon-pillow.svg'),
  maplePlant: asset('rewards/maple-plant.svg'), paperLantern: asset('rewards/paper-lantern.svg'),
  foxPlush: asset('rewards/fox-plush.svg'), windChime: asset('rewards/wind-chime.svg'),
};
export const TROPHY_ART: Record<AchievementId, SvgAsset> = {
  firstNap: asset('trophies/first-nap.svg'), quietNap: asset('trophies/quiet-nap.svg'),
  dreamWeaver: asset('trophies/dream-weaver.svg'), moonCollector: asset('trophies/moon-collector.svg'),
  perfectNap: asset('trophies/perfect-nap.svg'), dreamGuardian: asset('trophies/dream-guardian.svg'),
};
export const UI_ART = {
  ArrowLeft: asset('ui/arrow-left.svg'), ArrowRight: asset('ui/arrow-right.svg'),
  ChevronLeft: asset('ui/chevron-left.svg'), ChevronRight: asset('ui/chevron-right.svg'),
  Award: asset('ui/award.svg'), BookOpen: asset('ui/journal.svg'), Check: asset('ui/check.svg'),
  CircleHelp: asset('ui/help.svg'), Clock3: asset('ui/clock.svg'), Download: asset('ui/download.svg'),
  Gift: asset('ui/gift.svg'), Globe2: asset('ui/globe.svg'), Heart: asset('ui/heart.svg'),
  House: asset('ui/home.svg'), LockKeyhole: asset('ui/lock.svg'), Maximize2: asset('ui/fullscreen.svg'),
  Moon: asset('ui/moon.svg'), MousePointer2: asset('ui/pointer.svg'), Pause: asset('ui/pause.svg'),
  Play: asset('ui/play.svg'), RotateCcw: asset('ui/restart.svg'), Settings2: asset('ui/settings.svg'),
  Sparkles: asset('ui/sparkles.svg'), Sun: asset('ui/sun.svg'), Trophy: asset('ui/trophy.svg'),
  Volume2: asset('ui/sound-on.svg'), VolumeX: asset('ui/sound-off.svg'), Wind: asset('ui/wind.svg'), X: asset('ui/close.svg'),
};
export const FAVICON_ART = asset('ui/favicon.svg');
export const TEXTURE_ART = asset('ui/paper-grain.svg');