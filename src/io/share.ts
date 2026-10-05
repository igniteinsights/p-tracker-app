export type DeliverResult = 'shared' | 'downloaded' | 'cancelled';

/** Share sheet on Android when files can be shared, otherwise a download. */
export async function deliverFile(name: string, mime: string, content: string): Promise<DeliverResult> {
  const file = new File([content], name, { type: mime });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return 'shared';
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}
