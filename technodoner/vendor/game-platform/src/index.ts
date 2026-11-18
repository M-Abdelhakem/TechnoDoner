// Pick the adapter for the site that is running the game. Hosts inject their SDK before the game's
// own scripts run, so the choice is synchronous at import time; `web` is the default.
import type { Platform } from './types';
import { hasRemix, remixPlatform } from './remix';
import { hasWavedash, wavedashPlatform } from './wavedash';
import { webPlatform } from './web';

export type * from './types';

/**
 * `gameId` prefixes this game's saves in the browser. A `platform` query parameter forces an
 * adapter for trying one locally (`?platform=remix` with a stub SDK on the page, for instance).
 */
export function detectPlatform(gameId: string): Platform {
  const forced = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('platform') : null;
  if (forced === 'web') return webPlatform(gameId);
  if (hasWavedash()) return wavedashPlatform(gameId);
  if (hasRemix()) return remixPlatform(gameId);
  return webPlatform(gameId);
}
