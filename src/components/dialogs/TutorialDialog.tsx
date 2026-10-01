import { NapTutorial } from '../NapTutorial.tsx';
import { useDialog, useDialogBlocked } from './DialogContext.tsx';

export function TutorialDialog() {
  const { t, tutorial } = useDialog();
  const blocked = useDialogBlocked();
  return <NapTutorial t={t} onFinish={tutorial.finish} returning={tutorial.returning} suspended={blocked} onActivityChange={tutorial.onActivityChange} />;
}
