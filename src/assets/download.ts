import { strToU8 } from 'fflate';
import { GAME_IMAGES } from './images';
import { SVG_ASSETS } from './vectors';
import { buildImageArchive, decodeDataImage } from '../core/imagePack';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.style.display = 'none';
  document.body.append(anchor);
  anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function downloadAllImages(title: string) {
  const images = [
    { path: 'nap-room.jpg', bytes: decodeDataImage(GAME_IMAGES.room) },
    ...Object.values(SVG_ASSETS).sort((a, b) => a.path.localeCompare(b.path)).map((image) => ({ path: image.path, bytes: strToU8(image.raw) })),
  ];
  const archive = buildImageArchive(images, title);
  const buffer = new Uint8Array(archive.byteLength);
  buffer.set(archive);
  downloadBlob(new Blob([buffer.buffer], { type: 'application/zip' }), 'five-more-minutes-images.zip');
}