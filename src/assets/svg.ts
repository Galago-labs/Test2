export interface SvgAsset {
  path: string;
  raw: string;
  body: string;
  viewBox: string;
  fill: string;
  stroke?: string;
  strokeWidth?: string;
  strokeLinecap?: 'butt' | 'round' | 'square';
  strokeLinejoin?: 'miter' | 'round' | 'bevel';
  dataUrl: string;
}

// Only checked-in SVG imports enter this function; never pass user or network markup.
export function parseSvgAsset(path: string, raw: string): SvgAsset {
  const root = raw.match(/<svg\b([^>]*)>([\s\S]*?)<\/svg>\s*$/i);
  if (!root || /<script\b|<foreignObject\b|\bon\w+\s*=|(?:href|src)\s*=\s*["'](?:https?:|\/\/)/i.test(raw)) throw new Error(`Invalid local SVG: ${path}`);
  const attribute = (name: string) => root[1].match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1];
  const viewBox = attribute('viewBox');
  if (!viewBox) throw new Error(`Missing SVG viewBox: ${path}`);
  return {
    path, raw, body: root[2], viewBox, fill: attribute('fill') || 'none',
    stroke: attribute('stroke'), strokeWidth: attribute('stroke-width'),
    strokeLinecap: attribute('stroke-linecap') as SvgAsset['strokeLinecap'],
    strokeLinejoin: attribute('stroke-linejoin') as SvgAsset['strokeLinejoin'],
    dataUrl: `data:image/svg+xml,${encodeURIComponent(raw)}`,
  };
}