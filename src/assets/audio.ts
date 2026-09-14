import musicBamboo from '../../public/audio/music-bamboo.mp3?inline';
import birds1 from '../../public/audio/birds-1.mp3?inline';
import birds2 from '../../public/audio/birds-2.mp3?inline';
import frogs from '../../public/audio/frogs.mp3?inline';

// Vite embeds the actual local audio bytes, including in development.
// This keeps the single-file build independent of iframe/document base URLs,
// the same way GAME_IMAGES embeds nap-room.jpg.
export const GAME_AUDIO = Object.freeze({
  music: musicBamboo,
  birds1,
  birds2,
  frogs,
});
