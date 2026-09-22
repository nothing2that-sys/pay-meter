export interface DocumentPictureInPictureApi {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>;
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPictureApi;
  }
}

export function supportsDocumentPiP(target: Window = window): boolean {
  return typeof target.documentPictureInPicture?.requestWindow === 'function';
}

export async function openDocumentPiP(target: Window = window): Promise<Window> {
  const api = target.documentPictureInPicture;
  if (!api) throw new Error('Document Picture-in-Picture is not supported.');
  return api.requestWindow({ width: 360, height: 440 });
}
