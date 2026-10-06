import { describe, expect, it } from 'vitest';
import { chapterTitle, NAMED_CHAPTERS } from './chapterTitle';

describe('the title of a chapter in the hub', () => {
  it('the chapters of the playtest go by their names', () => {
    expect(NAMED_CHAPTERS).toEqual(['0', '1', '2']);
    expect(chapterTitle('1')).toEqual({ key: 'hub.chapterName.1', params: {} });
  });

  it('a chapter not yet written (teacher mode) goes by its number', () => {
    expect(chapterTitle('4')).toEqual({ key: 'hub.chapter', params: { number: 4 } });
  });
});
