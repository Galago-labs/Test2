import { useState } from 'react';
import { Download } from './Icons';
import { downloadAllImages } from '../assets/download';
import { SVG_ASSETS } from '../assets/vectors';
import type { Translator } from '../i18n';

export function AssetDownloads({ t }: { t: Translator }) {
  const [message, setMessage] = useState<'assets.saved' | 'assets.failed' | null>(null);
  const download = (action: () => void) => {
    try { action(); setMessage('assets.saved'); } catch { setMessage('assets.failed'); }
  };
  return <section className="asset-downloads" aria-label={t('assets.title')}>
    <h3>{t('assets.title')}</h3>
    <p>{t('assets.description', { count: Object.keys(SVG_ASSETS).length + 1 })}</p>
    <button className="small-action asset-download-button" onClick={() => download(() => downloadAllImages(t('assets.title')))}><Download size={16} />{t('assets.download')}</button>
    {message && <p className="asset-download-status" role="status">{t(message)}</p>}
  </section>;
}