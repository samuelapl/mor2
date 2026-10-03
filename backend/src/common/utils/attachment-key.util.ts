/** Derives the storage object key from a stored file URL (e.g. `attachments/<uuid>.pdf`). */
export function deriveAttachmentFileKey(fileUrl: string, fileName?: string): string {
  try {
    const url = new URL(fileUrl);
    const parts = url.pathname.split('/');
    if (parts.length >= 3) {
      return parts.slice(2).join('/');
    }
  } catch {
    // fallback if fileUrl is relative
  }
  if (fileUrl.includes('/attachments/')) {
    return `attachments/${fileUrl.split('/attachments/')[1]}`;
  }
  return `attachments/${fileName || 'file'}`;
}
