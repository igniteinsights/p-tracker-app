export function saveErrorMessage(err: unknown): string {
  return (err as DOMException)?.name === 'QuotaExceededError' ? "Couldn't save. Storage is full." : "Couldn't save. Try again.";
}
