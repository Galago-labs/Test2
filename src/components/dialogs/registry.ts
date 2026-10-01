import type { ComponentType } from 'react';
import type { DialogKind } from '../../game/dialogState.ts';
import { ExitDialog } from './ExitDialog.tsx';
import { DreamRevealDialog } from './DreamRevealDialog.tsx';
import { GuideDialog } from './GuideDialog.tsx';
import { JournalDialog } from './JournalDialog.tsx';
import { MenuDialog } from './MenuDialog.tsx';
import { RoomDialog } from './RoomDialog.tsx';
import { SavesDialog } from './SavesDialog.tsx';
import { SettingsDialog } from './SettingsDialog.tsx';
import { StoryDialog } from './StoryDialog.tsx';
import { TutorialDialog } from './TutorialDialog.tsx';

export interface DialogDefinition {
  Screen: ComponentType;
  /** Selector for the control that receives focus first; defaults to the first button. */
  initialFocus?: string;
}

// The single list of dialog screens. Typed over every DialogKind, so adding a
// kind in game/dialogState.ts without giving it a screen here will not compile.
export const DIALOGS: Record<DialogKind, DialogDefinition> = {
  menu: { Screen: MenuDialog },
  saves: { Screen: SavesDialog },
  guide: { Screen: GuideDialog },
  story: { Screen: StoryDialog },
  intro: { Screen: TutorialDialog, initialFocus: '.practice-area' },
  journal: { Screen: JournalDialog },
  settings: { Screen: SettingsDialog },
  room: { Screen: RoomDialog },
  exitConfirm: { Screen: ExitDialog },
  dreamReveal: { Screen: DreamRevealDialog },
};
