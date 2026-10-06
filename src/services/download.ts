import type { ExportedFile } from './exportLog';

/** The pieces of the browser a download needs, injected so it can be tested without one. */
export interface DownloadHost {
  createObjectURL(blob: Blob): string;
  revokeObjectURL(url: string): void;
  createLink(): { href: string; download: string; click(): void };
}

/** The real browser. */
export const browserHost = (): DownloadHost => ({
  createObjectURL: (blob) => URL.createObjectURL(blob),
  revokeObjectURL: (url) => URL.revokeObjectURL(url),
  createLink: () => document.createElement('a'),
});

/**
 * Saves a file on the player's machine: the browser's own download, through a temporary link to
 * the data. Nothing is sent anywhere; the player decides what to do with the file.
 */
export function download(file: ExportedFile, host: DownloadHost = browserHost()): void {
  const url = host.createObjectURL(new Blob([file.text], { type: file.type }));
  const link = host.createLink();
  link.href = url;
  link.download = file.filename;
  link.click();
  host.revokeObjectURL(url);
}
