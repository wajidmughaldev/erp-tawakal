// Document downloads always answer application/octet-stream, so the viewer type comes from the file extension.
// Uploads are limited to these formats (and checked by content on the server).
const viewableTypes: Record<string, string> = {pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp'};

/** Opens a stored document in a new tab, or saves it when `download` is set or the format cannot be previewed. */
export async function openDocument(load: () => Promise<Blob>, name: string, download: boolean) {
  let tab: Window | null = null;
  try {
    // Open the tab first so the popup blocker treats it as a direct result of the click.
    if (!download) tab = window.open('about:blank', '_blank');
    const blob = await load();
    const viewType = viewableTypes[name.split('.').pop()?.toLowerCase() ?? ''];
    const url = URL.createObjectURL(viewType ? new Blob([blob], {type: viewType}) : blob);
    if (download || !viewType) {
      tab?.close();
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = name; anchor.click();
    } else if (tab) {
      tab.opener = null; tab.location.replace(url);
    } else throw new Error('The document window was blocked. Allow popups or use Download.');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (cause) {
    tab?.close();
    throw cause;
  }
}
