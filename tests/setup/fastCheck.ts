// Vitest setup: applies the project's fast-check settings (fixed seed by default) before any test
// file runs, so every property is reproducible unless a run explicitly asks to explore.
import fc from 'fast-check';
import { fastCheckSettings } from '../support/fastCheckSettings';

fc.configureGlobal(fastCheckSettings(process.env));
