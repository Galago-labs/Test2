import { Check } from '../Icons.tsx';
import { SoftButton } from '../SoftButton.tsx';
import { DREAM_IMAGES } from '../../assets/images.ts';
import { useDialog } from './DialogContext.tsx';

export function DreamRevealDialog() {
  const { t, close, completedScenario } = useDialog();
  if (!completedScenario) return null;
  return <>
    <span className="eyebrow">{t('dream.eyebrow')}</span>
    <h2 id="dialog-title">{t(`scenario.${completedScenario}.name`)}</h2>
    <img className="dream-reveal-art" src={DREAM_IMAGES[completedScenario]} alt="" draggable={false} />
    <p className="dialog-intro">{t(`scenario.${completedScenario}.memory`)}</p>
    <SoftButton onClick={close}><Check size={17} />{t('dream.close')}</SoftButton>
  </>;
}
