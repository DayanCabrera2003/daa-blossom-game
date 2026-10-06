import { afterEach, describe, expect, it, vi } from 'vitest';
import { browserHost, download, type DownloadHost } from './download';

const file = { filename: 'log.json', type: 'application/json', text: '{"a":1}' };

/** A host that records what a download did instead of doing it. */
function recordingHost() {
  const made: Blob[] = [];
  const clicked: { href: string; download: string }[] = [];
  const revoked: string[] = [];
  const host: DownloadHost = {
    createObjectURL: (blob) => {
      made.push(blob);
      return `blob:${made.length}`;
    },
    revokeObjectURL: (url) => void revoked.push(url),
    createLink: () => {
      const link = {
        href: '',
        download: '',
        click: () => void clicked.push({ href: link.href, download: link.download }),
      };
      return link;
    },
  };
  return { host, made, clicked, revoked };
}

describe('download', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('hands the file to the browser through a link, then lets the data go', async () => {
    const { host, made, clicked, revoked } = recordingHost();
    download(file, host);
    expect(clicked).toEqual([{ href: 'blob:1', download: 'log.json' }]);
    expect(revoked).toEqual(['blob:1']);
    expect(made[0]?.type).toBe('application/json');
    expect(await made[0]?.text()).toBe('{"a":1}');
  });

  it('in the browser, uses object URLs and a link element', () => {
    const link = { href: '', download: '', click: vi.fn() };
    const createElement = vi.fn(() => link);
    vi.stubGlobal('document', { createElement });
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockReturnValue();
    download(file, browserHost());
    expect(createElement).toHaveBeenCalledWith('a');
    expect(link).toMatchObject({ href: 'blob:x', download: 'log.json' });
    expect(link.click).toHaveBeenCalledOnce();
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:x');
    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
  });
});
