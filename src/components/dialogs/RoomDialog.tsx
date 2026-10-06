import { RoomView } from '../RoomView.tsx';
import { useDialog } from './DialogContext.tsx';
import { SaveFootnote } from './SaveFootnote.tsx';

export function RoomDialog() {
  const { t, progress, equipDecoration, close } = useDialog();
  return <>
    <RoomView progress={progress} t={t} onEquip={equipDecoration} onClose={close} />
    <SaveFootnote warn />
  </>;
}
