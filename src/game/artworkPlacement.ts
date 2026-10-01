// © 2026 Oriby Games. All rights reserved. Unauthorized copying or redistribution is prohibited.
// Third-party components: see public/third-party-notices.txt.
// Where things are on the room illustration, on screen.
//
// The room picture fills the stage with `object-fit: cover`, so how much of it
// is cropped — and therefore where Momo appears — depends on the stage's shape.
// Anything that must sit *on the artwork* (the sleeping z's above her hat) is
// placed with this module, never with a percentage of the screen, which would
// drift onto her forehead or ear on a different aspect ratio.
//
// Pure geometry, no assets or React, so it is unit-tested against real
// measurements of the rendered game.
import { DESIGN_SIZES, type Size, type ViewportProfile } from './viewport.ts';

/** Natural pixel size of public/images/nap-room.jpg. */
export const ROOM_ART: Size = { width: 1825, height: 768 };

/** Which part of the artwork stays in view when it is cropped (CSS object-position, 0..1). */
export const ROOM_FOCUS: Record<ViewportProfile, { x: number; y: number }> = {
  landscape: { x: 0.55, y: 0.55 },
  compact: { x: 0.55, y: 0.55 },
  portrait: { x: 0.67, y: 0.45 },
};

/** Top-centre of Momo's hat, as a fraction of the artwork (measured on the rendered game). */
export const MOMO_HAT = { u: 0.705, v: 0.2167 };

export interface Placement { scale: number; left: number; top: number }

/** Exactly what `object-fit: cover; object-position: focus` does to the artwork inside a stage. */
export function coverPlacement(stage: Size, art: Size, focus: { x: number; y: number }): Placement {
  const scale = Math.max(stage.width / art.width, stage.height / art.height);
  return {
    scale,
    left: (stage.width - art.width * scale) * focus.x,
    top: (stage.height - art.height * scale) * focus.y,
  };
}

/** Stage-space position of a point on the artwork, plus the artwork's current scale. */
export function artworkPoint(stage: Size, profile: ViewportProfile, point: { u: number; v: number }) {
  const { scale, left, top } = coverPlacement(stage, ROOM_ART, ROOM_FOCUS[profile]);
  return { x: left + point.u * ROOM_ART.width * scale, y: top + point.v * ROOM_ART.height * scale, scale };
}

// The sleeping z's rise from just off Momo's hat. The anchor is in artwork pixels
// from the top-centre of the hat, so it follows her at every crop and scale.
// `direction` is which way the trail climbs: in portrait she fills the frame and
// sits near the right edge, next to the top buttons, so the trail climbs to the
// left instead of the right to stay on screen and clear of them.
const SLEEP_LETTERS: Record<ViewportProfile, { x: number; y: number; direction: 1 | -1 }> = {
  landscape: { x: 19, y: -17, direction: 1 },
  compact: { x: 19, y: -17, direction: 1 },
  portrait: { x: -12, y: -8, direction: -1 },
};

// The letters' own sizes are authored for the landscape design, where the
// artwork is drawn at this scale; on any other scale they grow or shrink with her.
const LETTERS_REFERENCE_SCALE = DESIGN_SIZES.landscape.height / ROOM_ART.height;

export function sleepLettersPlacement(stage: Size, profile: ViewportProfile) {
  const hat = artworkPoint(stage, profile, MOMO_HAT);
  const letters = SLEEP_LETTERS[profile];
  return { x: hat.x + letters.x * hat.scale, y: hat.y + letters.y * hat.scale, scale: hat.scale / LETTERS_REFERENCE_SCALE, direction: letters.direction };
}
