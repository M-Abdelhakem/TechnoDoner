// Wavedash (wavedash.com) injects `window.Wavedash` before any script runs and keeps the game
// behind its loading screen until init() is called. Saves go to its cloud files, scores to its
// leaderboards. The game is framed, so links open through the host and sign-in is Wavedash's.
import type { Leaderboard, LeaderboardOptions, Platform, Saves } from './types';
import { Listeners, localSaves, shareOrCopy } from './shared';

type Result<T = unknown> = { success: boolean; data?: T; message?: string };
interface WavedashSdk {
  init(options?: { debug?: boolean }): Promise<unknown> | void;
  updateLoadProgressZeroToOne?(fraction: number): void;
  getUser(): Promise<Result<{ id?: string; userId?: string; username?: string; avatarUrl?: string }>> | { id?: string; username?: string };
  writeLocalFile(path: string, data: Uint8Array): unknown;
  readLocalFile(path: string): Uint8Array | Promise<Uint8Array> | null;
  uploadRemoteFile(path: string): Promise<Result>;
  downloadRemoteFile(path: string): Promise<Result>;
  deleteRemoteFile(path: string): Promise<Result>;
  getOrCreateLeaderboard(name: string, sortOrder: unknown, displayType: unknown): Promise<Result<{ id: string; name: string }>>;
  uploadLeaderboardScore(id: string, score: number, keepBest: boolean): Promise<Result<{ globalRank?: number; score?: number }>>;
  listLeaderboardEntries(id: string, start: number, count: number, friendsOnly: boolean): Promise<Result<Array<{ username: string; score: number; globalRank: number; userId: string }>>>;
  LeaderboardSortOrder: { ASC: unknown; DESC: unknown };
  LeaderboardDisplayType: { NUMERIC: unknown; TIME_SECONDS: unknown; TIME_MILLISECONDS: unknown };
}

export function hasWavedash(): boolean {
  return typeof window !== 'undefined' && typeof (window as unknown as { Wavedash?: unknown }).Wavedash !== 'undefined';
}

export function wavedashPlatform(gameId: string): Platform {
  const sdk = (window as unknown as { Wavedash: WavedashSdk }).Wavedash;
  const local = localSaves(gameId);
  const playAgain = new Listeners<void>();
  const mute = new Listeners<boolean>();
  let myId: string | null = null;

  const saves: Saves = {
    // the cloud copy wins when it exists; the local copy is the fallback and the cache
    async read(key) {
      try {
        const got = await sdk.downloadRemoteFile(key);
        if (got.success) {
          const bytes = await sdk.readLocalFile(key);
          if (bytes) { const text = new TextDecoder().decode(bytes); await local.write(key, text); return text; }
        }
      } catch { /* offline or no cloud: use the local copy */ }
      return local.read(key);
    },
    async write(key, value) {
      await local.write(key, value);
      try { await sdk.writeLocalFile(key, new TextEncoder().encode(value)); await sdk.uploadRemoteFile(key); } catch { /* keep the local copy */ }
    },
    async remove(key) {
      await local.remove(key);
      try { await sdk.deleteRemoteFile(key); } catch { /* ignore */ }
    },
  };

  function leaderboard(name: string, options: LeaderboardOptions = {}): Leaderboard {
    const order = options.order === 'asc' ? sdk.LeaderboardSortOrder.ASC : sdk.LeaderboardSortOrder.DESC;
    const display = options.display === 'seconds' ? sdk.LeaderboardDisplayType.TIME_SECONDS
      : options.display === 'millis' ? sdk.LeaderboardDisplayType.TIME_MILLISECONDS : sdk.LeaderboardDisplayType.NUMERIC;
    let idPromise: Promise<string | null> | null = null;
    const id = () => (idPromise ??= sdk.getOrCreateLeaderboard(name, order, display).then((r) => (r.success && r.data ? r.data.id : null)).catch(() => null));
    return {
      async submit(score) {
        const board = await id(); if (!board) return null;
        const r = await sdk.uploadLeaderboardScore(board, score, true).catch(() => null);
        return r?.success && r.data ? { rank: r.data.globalRank, best: r.data.score } : null;
      },
      async top(count = 10) {
        const board = await id(); if (!board) return [];
        const r = await sdk.listLeaderboardEntries(board, 0, count, false).catch(() => null);
        return r?.success && r.data ? r.data.map((e) => ({ rank: e.globalRank, name: e.username, score: e.score, mine: e.userId === myId })) : [];
      },
    };
  }

  return {
    name: 'wavedash',
    hosted: true,
    progress(fraction) { try { sdk.updateLoadProgressZeroToOne?.(Math.max(0, Math.min(1, fraction))); } catch { /* ignore */ } },
    async ready() { try { await sdk.init(); } catch { /* the host shows the game anyway */ } },
    gameOver() {},
    onPlayAgain: (l) => playAgain.add(() => l()),
    onMute: (l) => mute.add(l),
    async user() {
      try {
        const got = await sdk.getUser();
        const u = (got && typeof got === 'object' && 'success' in got ? (got as Result<Record<string, string>>).data : got) as Record<string, string> | undefined;
        if (!u) return null;
        myId = u.id ?? u.userId ?? null;
        return myId ? { id: myId, name: u.username ?? 'Player', avatar: u.avatarUrl } : null;
      } catch { return null; }
    },
    saves,
    leaderboard,
    share: shareOrCopy,
  };
}
