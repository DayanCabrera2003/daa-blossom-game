import { compareLevelIds } from './catalog';
import {
  CODEX_ENTRIES,
  CODEX_TABS,
  isWhole,
  unlockedTabs,
  type CodexEntryId,
  type CodexTab,
  type CodexUnlock,
} from './codex';

/**
 * The Codex checks of the whole catalog (plan 07, phase 1), shared by the test suite and
 * `tools/check-levels`. Unlike the integrity of one level, they read the levels in play order: the
 * book must open whole by the end of the game, each entry opening at most in part before it opens
 * whole, and a notebook statement may promise its translation ("you will read it") but never send
 * the player to a page they could already read before writing it.
 */

/** What the checks read of a level; a level as loaded (`LevelData`) has all of it. */
export interface CodexLevel {
  readonly id: string;
  readonly draft: boolean;
  readonly unlocks: { readonly codex: readonly CodexUnlock[] };
  readonly notebook?: readonly { readonly codex: CodexEntryId }[] | undefined;
}

/** Something wrong with how the catalog opens the Codex. */
export type CodexProblem =
  /** No playable level opens every tab of the entry. */
  | { readonly code: 'codexNeverWhole'; readonly entry: CodexEntryId }
  /** `level` opens only some tabs of an entry that was already whole. */
  | { readonly code: 'codexPartAfterWhole'; readonly entry: CodexEntryId; readonly level: string }
  /** Question `question` of `level` links to an entry already whole before that level, at `opensAt`. */
  | {
      readonly code: 'notebookLinkBehind';
      readonly level: string;
      readonly question: number;
      readonly entry: CodexEntryId;
      readonly opensAt: string;
    };

/** Checks how the catalog opens the Codex; an empty list means it is sound. */
export function checkCodex(levels: readonly CodexLevel[]): CodexProblem[] {
  const problems: CodexProblem[] = [];
  const ordered = [...levels].sort((a, b) => compareLevelIds(a.id, b.id));

  // Drafts are never played outside teacher mode, so they open nothing for the player.
  const open = new Map<CodexEntryId, Set<CodexTab>>();
  const wholeAt = new Map<CodexEntryId, string>();
  for (const level of ordered.filter((candidate) => !candidate.draft)) {
    for (const unlock of level.unlocks.codex) {
      const { entry, tabs } = unlockedTabs(unlock);
      if (wholeAt.has(entry) && tabs.length < CODEX_TABS.length) {
        problems.push({ code: 'codexPartAfterWhole', entry, level: level.id });
      }
      const known = open.get(entry) ?? new Set<CodexTab>();
      for (const tab of tabs) known.add(tab);
      open.set(entry, known);
      if (!wholeAt.has(entry) && isWhole(known)) wholeAt.set(entry, level.id);
    }
  }
  for (const entry of CODEX_ENTRIES) {
    if (!wholeAt.has(entry)) problems.push({ code: 'codexNeverWhole', entry });
  }

  // A link to an entry that never opens whole is already told above, once.
  for (const level of ordered) {
    for (const [question, { codex: entry }] of (level.notebook ?? []).entries()) {
      const opensAt = wholeAt.get(entry);
      if (opensAt !== undefined && compareLevelIds(opensAt, level.id) < 0) {
        problems.push({ code: 'notebookLinkBehind', level: level.id, question, entry, opensAt });
      }
    }
  }
  return problems;
}
