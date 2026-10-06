import roomImage from '../../public/images/nap-room.jpg?inline';
import momoContent from '../../public/images/momo-content.png?inline';
import momoAnxious from '../../public/images/momo-anxious.png?inline';
import momoAwake from '../../public/images/momo-awake.png?inline';
import dreamAfternoon from '../../public/images/dream-afternoon.png?inline';
import dreamBreeze from '../../public/images/dream-breeze.png?inline';
import dreamFireflies from '../../public/images/dream-fireflies.png?inline';

// Vite embeds the actual local image bytes, including in development.
// This also makes the single-file build independent of iframe/document base URLs.
export const GAME_IMAGES = Object.freeze({
  room: roomImage,
  momoContent,
  momoAnxious,
  momoAwake,
});

// Keyed by scenario so the UI can look one up directly — what a completed
// dream (5 wins in that scenario) reveals. Deliberately a separate map: unlike
// GAME_IMAGES these three are optional per-scenario rewards, not core assets.
export const DREAM_IMAGES = Object.freeze({
  afternoon: dreamAfternoon,
  breeze: dreamBreeze,
  fireflies: dreamFireflies,
});
