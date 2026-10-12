/** Shared restored files remain stored until their last attachment is removed. */
export function canRemoveCheckFile(remainingReferences: number, lookupFailed: boolean): boolean {
  return !lookupFailed && remainingReferences === 0;
}