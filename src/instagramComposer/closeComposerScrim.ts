/** Close a picker/sheet when the pointer lands on the dimmed scrim, not the dialog. */
export function closeComposerScrim(
  event: { target: unknown; currentTarget: unknown },
  onClose: () => void,
) {
  if (event.target === event.currentTarget) {
    onClose();
  }
}
