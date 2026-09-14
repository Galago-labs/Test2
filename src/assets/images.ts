import roomImage from '../../public/images/nap-room.jpg?inline';
import momoContent from '../../public/images/momo-content.png?inline';
import momoAnxious from '../../public/images/momo-anxious.png?inline';

// Vite embeds the actual local image bytes, including in development.
// This also makes the single-file build independent of iframe/document base URLs.
export const GAME_IMAGES = Object.freeze({
  room: roomImage,
  momoContent,
  momoAnxious,
});
