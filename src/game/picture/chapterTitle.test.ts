import { describe, expect, it } from 'vitest';
import { chapterTitle, NAMED_CHAPTERS } from './chapterTitle';

describe('the title of a chapter in the hub', () => {
  it('the written chapters go by their names', () => {
    expect(NAMED_CHAPTERS).toEqual(['0', '1', '2', '3', '4', '5']);
    expect(chapterTitle('1')).toEqual({ key: 'hub.chapterName.1', params: {} });
    expect(chapterTitle('3')).toEqual({ key: 'hub.chapterName.3', params: {} });
    expect(chapterTitle('4')).toEqual({ key: 'hub.chapterName.4', params: {} });
    expect(chapterTitle('5')).toEqual({ key: 'hub.chapterName.5', params: {} });
  });

  it('a chapter not yet written (teacher mode) goes by its number', () => {
    expect(chapterTitle('6')).toEqual({ key: 'hub.chapter', params: { number: 6 } });
  });
});
