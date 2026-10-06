import { ArrowRight, Check, Heart } from '../Icons.tsx';
import { DreamCloud } from '../NapArt.tsx';
import { SoftButton } from '../SoftButton.tsx';
import { useDialog } from './DialogContext.tsx';

const STEPS = ['move', 'catch', 'avoid', 'mood', 'scenario'] as const;

export function GuideDialog() {
  const { t, close, open } = useDialog();
  return <>
    <DreamCloud className="dialog-art" />
    <span className="eyebrow">{t('guide.eyebrow')}</span>
    <h2 id="dialog-title">{t('guide.title')}</h2>
    <p className="dialog-intro">{t('guide.intro')}</p>
    <div className="guide-steps">
      {STEPS.map((step, index) => (
        <div className="guide-step" key={step}>
          <span className="step-number">0{index + 1}</span>
          <div><h3>{t(`guide.${step}Title`)}</h3><p>{t(`guide.${step}`)}</p></div>
        </div>
      ))}
    </div>
    <div className="guide-goal"><Heart size={17} /><span>{t('guide.goal')}</span></div>
    <SoftButton onClick={close}><Check size={17} />{t('guide.button')}</SoftButton>
    <button className="text-button practice-link" onClick={() => open('intro')}>{t('guide.practice')}<ArrowRight size={13} /></button>
    <p className="dialog-footnote">{t('guide.keyBefore')} <kbd>{t('controls.space')}</kbd> {t('guide.keyAfter')}</p>
  </>;
}
