export type ViewportProfile = 'landscape' | 'compact' | 'portrait';
export interface Insets { top: number; right: number; bottom: number; left: number }
export interface Size { width: number; height: number }
export interface ViewportLayout extends Size {
  logicalWidth: number;
  logicalHeight: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  profile: ViewportProfile;
  safe: Insets;
}

export const DESIGN_SIZES: Record<ViewportProfile, Size> = {
  landscape: { width: 1280, height: 720 },
  compact: { width: 896, height: 504 },
  portrait: { width: 390, height: 700 },
};
export const MIN_DESKTOP_SCALE = 0.85;
const positiveSize = (value: number) => Number.isFinite(value) ? Math.max(1, value) : 1;
const inset = (value: number | undefined) => Number.isFinite(value) ? Math.max(0, value!) : 0;

export function fitGameStage(width: number, height: number, touch: boolean): Size {
  // Yandex Games requirement 1.6.2.2: the active area's long side must not
  // exceed the short side by more than 2x. This is a platform compliance
  // rule, not an internal preference — do not remove it for aesthetics.
  // https://yandex.com/dev/games/doc/en/concepts/requirements#1
  const availableWidth = positiveSize(width);
  const availableHeight = positiveSize(height);
  const stageWidth = Math.min(availableWidth, availableHeight * 2);
  const stageHeight = touch ? availableHeight : Math.min(availableHeight, stageWidth * 2);
  return { width: stageWidth, height: stageHeight };
}

// The same uniform transform is used by the artwork, controls, dialogs, and input.
// Expand the logical canvas on the spare axis instead of stretching either axis.
export function calculateViewport(width: number, height: number, touch = false, insets: Partial<Insets> = {}): ViewportLayout {
  const hostWidth = positiveSize(width);
  const hostHeight = positiveSize(height);
  const frame = fitGameStage(hostWidth, hostHeight, touch);
  const desktopScale = Math.min(frame.width / DESIGN_SIZES.landscape.width, frame.height / DESIGN_SIZES.landscape.height);
  const profile: ViewportProfile = frame.height > frame.width ? 'portrait' : desktopScale < MIN_DESKTOP_SCALE ? 'compact' : 'landscape';
  const design = DESIGN_SIZES[profile];
  const scale = Math.min(frame.width / design.width, frame.height / design.height);
  const offsetX = (hostWidth - frame.width) / 2;
  const offsetY = (hostHeight - frame.height) / 2;
  const logicalWidth = frame.width / scale;
  const logicalHeight = frame.height / scale;
  return {
    ...frame, logicalWidth, logicalHeight, scale, offsetX, offsetY, profile,
    safe: {
      top: Math.min(logicalHeight / 4, Math.max(0, inset(insets.top) - offsetY) / scale),
      bottom: Math.min(logicalHeight / 4, Math.max(0, inset(insets.bottom) - offsetY) / scale),
      left: Math.min(logicalWidth / 4, Math.max(0, inset(insets.left) - offsetX) / scale),
      right: Math.min(logicalWidth / 4, Math.max(0, inset(insets.right) - offsetX) / scale),
    },
  };
}

export function gameplayGeometry(logicalWidth: number, profile: ViewportProfile) {
  const width = positiveSize(logicalWidth);
  const pillowWidth = profile === 'portrait' ? 112 : profile === 'compact' ? 132 : 156;
  const spriteWidth = profile === 'portrait' ? 54 : profile === 'compact' ? 64 : 70;
  return {
    pillowWidth,
    spriteWidth,
    catchWidth: Math.min(35, (pillowWidth * 0.36 + spriteWidth * 0.28) / width * 100),
    pillowEdge: Math.min(40, (pillowWidth / 2 + 3) / width * 100),
  };
}

export function pointerToGameX(clientX: number, bounds: { left: number; width: number }): number | null {
  if (!Number.isFinite(clientX) || !Number.isFinite(bounds.left) || !Number.isFinite(bounds.width) || bounds.width <= 0) return null;
  return Math.min(100, Math.max(0, (clientX - bounds.left) / bounds.width * 100));
}