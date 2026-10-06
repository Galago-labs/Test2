import { ArrowRight } from '../Icons.tsx';
import { MapleLeaf, MoonMark } from '../NapArt.tsx';
import { SoftButton } from '../SoftButton.tsx';
import { useDialog } from './DialogContext.tsx';

export function StoryDialog() {
  const { t, close } = useDialog();
  return <>
    <MoonMark className="dialog-art story-moon" />
    <span className="eyebrow">{t('story.eyebrow')}</span>
    <h2 id="dialog-title">{t('story.title')}</h2>
    <div className="story-copy"><p>{t('story.p1')}</p><p>{t('story.p2')}</p><p><em>{t('story.p3')}</em></p><p>{t('story.p4')}</p></div>
    <div className="story-signature"><MapleLeaf />{t('story.signature')}</div>
    <SoftButton onClick={close}>{t('story.button')}<ArrowRight size={17} /></SoftButton>
  </>;
}
