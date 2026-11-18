// The game on its own site (jommi.fi, a Worker, a dev server): nothing frames it, there is no host
// SDK, and saves live in this browser. Leaderboards come later from the shared games service.
import type { Platform } from './types';
import { Listeners, localSaves, shareOrCopy } from './shared';

export function webPlatform(gameId: string): Platform {
  const playAgain = new Listeners<void>();
  const mute = new Listeners<boolean>();
  return {
    name: 'web',
    hosted: false,
    progress() {},
    async ready() {},
    gameOver() {},
    onPlayAgain: (l) => playAgain.add(() => l()),
    onMute: (l) => mute.add(l),
    async user() { return null; },
    saves: localSaves(gameId),
    leaderboard() { return null; },
    share: shareOrCopy,
  };
}
