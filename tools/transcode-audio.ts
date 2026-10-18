// transcode-audio: makes the AAC fallback (`.m4a`) of every Ogg Vorbis sound the manifest ships,
// for Safari before 18.4, which cannot decode the Ogg container (plan 09, phase 8), and writes the
// table of them, src/game/assets/fallbacks.json, with the encoder's version.
// Needs the system's ffmpeg (made with ffmpeg 7.1.5 of Fedora 43, `dnf install ffmpeg`); no npm
// package. Run it after `npm run assets` whenever an Ogg sound changes; `npm run assets:check`
// says when. Usage: npm run assets:fallbacks
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import manifestJson from '../src/game/assets/manifest.json';
import { parseManifest } from '../src/game/assets/manifestSchema';
import { oggVorbisInfo } from './assets/oggVorbis';
import { ffmpegArgs, fallbackJobs, fallbackTable } from './assets/transcode';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TABLE = 'src/game/assets/fallbacks.json';

/** The encoder and its version, from the first line of `ffmpeg -version`. */
function encoderVersion(): string {
  try {
    const first = execFileSync('ffmpeg', ['-version'], { encoding: 'utf8' }).split('\n')[0] ?? '';
    const version = /^ffmpeg version (\S+)/.exec(first)?.[1];
    if (version === undefined) throw new Error(`unexpected ffmpeg -version: ${first}`);
    return `ffmpeg ${version}`;
  } catch (error) {
    throw new Error('ffmpeg is needed to make the audio fallbacks', { cause: error });
  }
}

const encoder = encoderVersion();
const jobs = fallbackJobs(parseManifest(manifestJson));
for (const job of jobs) {
  const { channels } = oggVorbisInfo(new Uint8Array(readFileSync(join(ROOT, job.input))));
  execFileSync('ffmpeg', ffmpegArgs(join(ROOT, job.input), join(ROOT, job.output), channels));
  console.log(`  ${job.output}`);
}
const table = fallbackTable(encoder, jobs, (output) => statSync(join(ROOT, output)).size);
writeFileSync(join(ROOT, TABLE), `${JSON.stringify(table, null, 2)}\n`);
console.log(`Made ${jobs.length} fallbacks with ${encoder}.`);
