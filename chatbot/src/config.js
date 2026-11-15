// Paths and settings shared by the server and the room loader.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const CHATBOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REPO_ROOT = path.resolve(CHATBOT_DIR, '..');

// Load chatbot/.env without a dependency (real environment variables win).
const envFile = path.join(CHATBOT_DIR, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

// Where the heatmap keeps its room file in the team repo (newest location first).
const REPO_CANDIDATES = ['web/src/data/rooms.json', 'data/rooms.json'].map((p) => path.join(REPO_ROOT, p));
const repoRooms = REPO_CANDIDATES.find((p) => existsSync(p));
/** True when chatbot/ sits inside the team repo next to the heatmap's rooms.json. */
export const IN_REPO = Boolean(repoRooms);

// Amitesh's file on GitHub. Read through the GitHub API so updates show up within about a minute.
const GITHUB_REPO = process.env.ROOMS_GITHUB_REPO || 'c-rliang/Room-Booking-Website';
const GITHUB_PATH = process.env.ROOMS_GITHUB_PATH || 'web/src/data/rooms.json';
const GITHUB_REF = process.env.ROOMS_GITHUB_REF || 'feature/room-heatmap';
export const GITHUB_ROOMS_URL = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_PATH}?ref=${encodeURIComponent(GITHUB_REF)}`;

/**
 * Room source, in priority order:
 *  1. ROOMS_FILE in .env (a local file, e.g. data/rooms.sample.json)
 *  2. ROOMS_SOURCE=github, or running outside the repo: live from GitHub (sample file as fallback)
 *  3. Inside the repo: the heatmap's local file (update it with `git pull`)
 */
const SAMPLE = path.join(CHATBOT_DIR, 'data', 'rooms.sample.json');
const wantGithub = (process.env.ROOMS_SOURCE || '').toLowerCase() === 'github' || (!IN_REPO && !process.env.ROOMS_FILE && (process.env.ROOMS_SOURCE || '').toLowerCase() !== 'local');
export const ROOMS_FILE = process.env.ROOMS_FILE ? path.resolve(CHATBOT_DIR, process.env.ROOMS_FILE) : repoRooms || SAMPLE;
export const ROOMS_URL = process.env.ROOMS_FILE ? null : (process.env.ROOMS_URL || (wantGithub ? GITHUB_ROOMS_URL : null));
export const ROOMS_REFRESH_SECONDS = Math.max(15, Number(process.env.ROOMS_REFRESH_SECONDS) || 90);
/** Requests in 30 days that count as "fully booked" (red). Matches the heatmap's demo scale (70+ = red). */
export const POPULARITY_FULL = Math.max(1, Number(process.env.POPULARITY_FULL) || 70);
