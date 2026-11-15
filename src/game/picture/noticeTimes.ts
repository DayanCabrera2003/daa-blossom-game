import { TOAST_FADE_MS, toastDuration } from './toastDuration';

/** The pause between one notice gone and the next showing, in milliseconds. */
export const NOTICE_GAP_MS = 400;

/**
 * When each notice of a run shows, in milliseconds from now, the first at `first`: each waits for
 * the one before to stay its reading time (`toastDuration`), fade, and leave a short pause, since a
 * new toast replaces the one in sight. Short notices follow each other every 3.4 s, as they did
 * when every toast stayed 2.6 s.
 */
export function noticeTimes(messages: readonly string[], first: number): number[] {
  let at = first;
  return messages.map((message) => {
    const shows = at;
    at += toastDuration(message) + TOAST_FADE_MS + NOTICE_GAP_MS;
    return shows;
  });
}
