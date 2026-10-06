import { useDialog } from './DialogContext.tsx';

// The one-line "your progress is saved / is not being saved" note shown at the
// foot of the dialogs that display progress.
export function SaveFootnote({ warn = false }: { warn?: boolean }) {
  const { t, save } = useDialog();
  const message = save.status === 'future' ? 'journal.future'
    : save.status === 'recovered' ? 'journal.recovered'
    : save.available ? 'journal.saved' : 'journal.unsaved';
  return <p className={`dialog-footnote ${warn && save.status !== 'ok' ? 'storage-warning' : ''}`}>{t(message)}</p>;
}
