// Which audio fallbacks to make and how (plan 09, phase 8): Safari before 18.4 cannot decode the
// Ogg container, so every Ogg Vorbis sound of the manifest gets an AAC copy in `.m4a`, made by the
// system's ffmpeg from the same extracted file. Pure: `tools/transcode-audio.ts` runs the encoder.
import type { Fallbacks } from '../../src/game/assets/fallbackSchema';
import type { AssetKind, Manifest } from '../../src/game/assets/manifestSchema';

/** The kinds of asset that are sounds. */
const SOUND_KINDS: readonly AssetKind[] = ['music', 'sfx', 'voice', 'jingle'];

/** The AAC bit rate per channel, in kb/s: 128 for a stereo track, 64 for a mono effect. */
export const KBPS_PER_CHANNEL = 64;

/** One fallback to make: its sound, the files in and out, its served path and its original. */
export interface FallbackJob {
  readonly key: string;
  /** The original, relative to the repository root. */
  readonly input: string;
  /** The fallback, relative to the repository root. */
  readonly output: string;
  /** The fallback as the page serves it. */
  readonly path: string;
  /** The sha256 of the original, as the manifest gives it. */
  readonly from: string;
}

/** The fallback of a sound served at `path`: next to it, as AAC in `.m4a`. */
export const fallbackPath = (path: string): string => path.replace(/\.ogg$/, '.m4a');

/** A fallback for every Ogg sound of `manifest`, in manifest order; wave files play everywhere. */
export function fallbackJobs(manifest: Manifest): FallbackJob[] {
  return Object.entries(manifest.assets)
    .filter(([, entry]) => SOUND_KINDS.includes(entry.kind) && entry.path.endsWith('.ogg'))
    .map(([key, entry]) => ({
      key,
      input: `public/${entry.path}`,
      output: `public/${fallbackPath(entry.path)}`,
      path: fallbackPath(entry.path),
      from: entry.sha256,
    }));
}

/**
 * The arguments to ffmpeg that turn `input` (of `channels` channels) into its fallback `output`:
 * the audio only, no tags, ffmpeg's own AAC encoder at `KBPS_PER_CHANNEL` per channel and the
 * original's rate, and no encoder version written into the file, so the same ffmpeg gives the same
 * bytes on every run. In full, for a stereo track:
 * `ffmpeg -nostdin -hide_banner -loglevel error -y -i hub.ogg -map 0:a -map_metadata -1 -c:a aac
 * -b:a 128k -fflags +bitexact -flags:a +bitexact hub.m4a`.
 */
export function ffmpegArgs(input: string, output: string, channels: number): string[] {
  return [
    '-nostdin',
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    input,
    '-map',
    '0:a',
    '-map_metadata',
    '-1',
    '-c:a',
    'aac',
    '-b:a',
    `${KBPS_PER_CHANNEL * channels}k`,
    '-fflags',
    '+bitexact',
    '-flags:a',
    '+bitexact',
    output,
  ];
}

/** The table of the fallbacks made by `encoder`, each with its size (`sizeOf` its output). */
export function fallbackTable(
  encoder: string,
  jobs: readonly FallbackJob[],
  sizeOf: (output: string) => number,
): Fallbacks {
  return {
    encoder,
    files: Object.fromEntries(
      jobs.map((job) => [job.key, { path: job.path, from: job.from, bytes: sizeOf(job.output) }]),
    ),
  };
}
