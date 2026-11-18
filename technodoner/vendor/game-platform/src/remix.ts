// Remix (remix.gg) injects `window.RemixSDK` into every game before the game's own code, and that
// SDK has already announced ready. A scored game reports game_over once per run and starts a new
// one on play_again; the host owns the result screen. Saves stay in the browser: Remix isolates
// storage per game and per account.
import type { Platform } from './types';
import { Listeners, localSaves, shareOrCopy } from './shared';

interface GameInfo { player?: { id: string; name: string } }
interface RemixSdk {
  ready(): Promise<GameInfo>;
  onPlayAgain(callback: (data?: unknown) => void): void;
  onToggleMute(callback: (data: { isMuted: boolean }) => void): void;
  singlePlayer: { actions: { gameOver(data: { score: number }): void } };
}

function findSdk(): RemixSdk | null {
  const host = window as unknown as { RemixSDK?: RemixSdk; FarcadeSDK?: RemixSdk };
  return host.RemixSDK ?? host.FarcadeSDK ?? null;
}

export function hasRemix(): boolean {
  return typeof window !== 'undefined' && findSdk() !== null;
}

export function remixPlatform(gameId: string): Platform {
  const sdk = findSdk()!;
  const playAgain = new Listeners<void>();
  const mute = new Listeners<boolean>();
  let info: GameInfo | null = null;
  let over = false;
  sdk.onPlayAgain(() => { over = false; playAgain.emit(); });
  sdk.onToggleMute((d) => mute.emit(d.isMuted));
  const readyOnce = sdk.ready().then((answer) => { info = answer; });

  return {
    name: 'remix',
    hosted: true,
    progress() {},
    async ready() { await readyOnce; },
    gameOver(score) {
      if (over) return; // one report per run, until the host restarts us
      over = true;
      sdk.singlePlayer.actions.gameOver({ score });
    },
    onPlayAgain: (l) => playAgain.add(() => l()),
    onMute: (l) => mute.add(l),
    async user() { await readyOnce; return info?.player ? { id: info.player.id, name: info.player.name } : null; },
    saves: localSaves(gameId),
    leaderboard() { return null; }, // Remix's named leaderboards are declared in remix.json; wire them when a game needs them
    share: shareOrCopy,
  };
}
