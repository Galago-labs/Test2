import { Check } from '../Icons.tsx';
import { MoonMark } from '../NapArt.tsx';
import { SoftButton } from '../SoftButton.tsx';
import { useDialog } from './DialogContext.tsx';

export function ExitDialog() {
  const { t, close, confirmExit } = useDialog();
  return <>
    <MoonMark className="dialog-art" />
    <h2 id="dialog-title">{t('exit.title')}</h2>
    <p className="dialog-intro">{t('exit.body')}</p>
    <SoftButton onClick={confirmExit}><Check size={17} />{t('exit.confirm')}</SoftButton>
    <button className="text-button" onClick={close}>{t('exit.cancel')}</button>
  </>;
}
