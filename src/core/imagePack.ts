import { strToU8, zipSync, type Zippable } from 'fflate';

export interface PackImage { path: string; bytes: Uint8Array }
const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);

export function decodeDataImage(url: string): Uint8Array {
  const comma = url.indexOf(',');
  if (!url.startsWith('data:image/') || comma < 0) throw new Error('Expected an embedded image');
  if (!url.slice(0, comma).endsWith(';base64')) return strToU8(decodeURIComponent(url.slice(comma + 1)));
  const binary = atob(url.slice(comma + 1));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function buildImageArchive(images: PackImage[], title = 'Five More Minutes: complete image pack'): Uint8Array {
  const files: Zippable = {};
  const seen = new Set<string>();
  for (const image of images) {
    if (!/^[a-z0-9/_-]+\.(?:svg|jpg|png)$/.test(image.path) || image.path.startsWith('/') || seen.has(image.path)) throw new Error('Invalid image archive path');
    seen.add(image.path);
    files[`images/${image.path}`] = [image.bytes, { level: image.path.endsWith('.jpg') ? 0 : 6 }];
  }
  const figures = images.map((image) => `<a href="${escapeHtml(image.path)}" download><img src="${escapeHtml(image.path)}" alt="${escapeHtml(image.path)}"><span>${escapeHtml(image.path)}</span></a>`).join('\n');
  files['images/catalog.html'] = strToU8(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>body{margin:0;background:#f7f4e8;color:#536248;font:14px/1.7 system-ui,sans-serif;padding:32px}h1{font:32px Georgia,serif}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:25px}a{color:inherit;text-decoration:none;display:flex;flex-direction:column;align-items:center;gap:10px;padding:18px 8px;border-bottom:1px solid #e0e4d2}img{width:110px;height:110px;object-fit:contain}span{font-size:11px;overflow-wrap:anywhere}a:hover{background:#eef1e2}</style></head><body><h1>${escapeHtml(title)}</h1><main>${figures}</main></body></html>`);
  files['manifest.json'] = strToU8(JSON.stringify({ title, imageCount: images.length, images: images.map((image) => ({ path: `images/${image.path}`, bytes: image.bytes.length })) }, null, 2));
  files['README.txt'] = strToU8('All artwork is stored locally in images/. Open images/catalog.html to view it without a server or network. SVG files are real editable vector images, not remote links. nap-room.jpg is the original Momo illustration. The same files are embedded in the game.\n');
  return zipSync(files, { level: 6 });
}