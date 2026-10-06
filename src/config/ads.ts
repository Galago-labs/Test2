// © 2026 Oriby Games. All rights reserved. Unauthorized copying or redistribution is prohibited.
// Third-party components: see public/third-party-notices.txt.
//
// WHEN THE GAME SHOWS A FULL-SCREEN AD — the one file to edit to change that.
// Nothing here is logic: it is numbers and switches, read by src/game/adPolicy.ts.
//
// Every save slot has its own count. A new save starts fresh; a reload changes
// nothing; deleting a save forgets it. A save never shows more than `maxPerSave`.
//
// Recipes:
//   Turn the first ad off ............ set `enabled: false` on 'first-game'
//   Move it to after the 2nd game .... set `nth: 2` on 'first-game'
//   Turn the dream ads off ........... set `enabled: false` on 'dream-left'
//   Show fewer ads in total .......... lower `maxPerSave`
//   Show more ads in total ........... raise `maxPerSave` (and add rules below)
//
// A rule fires once per save (the dream rule once per dream), the first time its
// moment arrives. If the rule is changed later, saves that already saw it do not
// see it again, and saves that never did see it at their next chance. Keep a
// rule's `id` stable: it is how a save remembers having seen it.
import type { AdConfig } from '../game/adPolicy.ts';

export const AD_CONFIG: AdConfig = {
  // Four in a full run: the first game, then each of the three dreams.
  maxPerSave: 4,
  rules: [
    // After the nth game this save has finished (a game is one round of catching
    // dreams, won or lost; a game left half-way does not count).
    { id: 'first-game', trigger: 'game-finished', nth: 1, enabled: true },
    // When the player leaves a dream they have finished — five games of that
    // dream, then its picture seen and closed. Never after a half-played dream.
    { id: 'dream-left', trigger: 'dream-left', enabled: true },
  ],
};
