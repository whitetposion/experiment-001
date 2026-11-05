import type { RootState } from '@/app/hooks'

export const selectIsDetailsPanelOpen = (state: RootState) => state.ui.isDetailsPanelOpen
export const selectComposerTarget = (state: RootState) => state.ui.composerTarget
export const selectHighlightedMessageId = (state: RootState) => state.ui.highlightedMessageId
